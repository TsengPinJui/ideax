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
  Eye,
} from 'lucide-react';
import {
  PlatformDocument,
  PlatformDocumentModule,
  DEFAULT_PLATFORM_DOCUMENTS,
  INITIAL_VERSION_LOGS,
  PlatformVersionLog,
} from '../data/platformManualData';
import {
  getPlatformDocuments,
  savePlatformDocuments,
  getCalculatedVersionState,
  getStandardFolderName,
  formatDocumentToMarkdown,
  downloadAllDocumentsZip,
  downloadDocumentAsWord,
  downloadVersionLogAsMarkdown,
  downloadAllVersionLogsAsMarkdown,
  VersionState,
} from '../services/platformManualService';
import { APP_VERSION, APP_RELEASE_DATE, APP_LAST_UPDATED } from '../data/versionData';

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
      if (docs.length > 0) {
        setSelectedDocId((prev) => (prev && docs.some((d) => d.id === prev) ? prev : docs[0].id));
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDoc = documents.find((d) => d.id === selectedDocId) || documents[0];
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
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col h-[92vh] max-h-[92vh]">
        {/* Hidden File Input for Upload */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".docx,.doc,.md,.txt,.pdf,.csv,.json,.xlsx"
          onChange={handleFileUpload}
        />

        {/* Header Section */}
        <div className="p-4 sm:p-5 border-b border-stone-100 bg-gradient-to-b from-amber-50/50 to-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                  平台內部清單
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-stone-900 text-amber-400 font-mono text-xs font-bold shadow-2xs">
                  {versionState.currentVersion}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 font-bold text-xs">
                  {versionState.lastReleaseDate}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium text-xs">
                  共 {documents.length} 份文件
                </span>
              </div>
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
        <div className="px-4 sm:px-5 py-2.5 bg-stone-50/90 border-b border-stone-200/80 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{isZipping ? '打包中...' : '下載整個資料夾 (.zip)'}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs border border-stone-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 text-stone-500" />
              <span>上傳檔案</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增文件</span>
            </button>
          </div>
        </div>

        {/* Master-Detail Body: Desktop side-by-side (Left: List, Right: Preview), Mobile stacked (Top: List, Bottom: Preview) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-stone-200">
          {/* 1. 平台清單目錄區 (Desktop on Left, Mobile on Top) */}
          <div className="w-full md:w-80 lg:w-96 shrink-0 bg-stone-50/70 flex flex-col min-h-0 max-h-60 md:max-h-none overflow-hidden">
            <div className="px-3.5 py-2 bg-stone-100/90 border-b border-stone-200 flex items-center justify-between text-xs shrink-0">
              <span className="font-black text-stone-900 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-600" />
                <span>平台清單目錄 ({documents.length})</span>
              </span>
              <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full md:hidden">
                點選下方即時預覽
              </span>
              <span className="text-[10px] font-bold text-stone-500 hidden md:inline">
                點選右側即時預覽
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2">
              {documents.map((doc) => {
                const isSelected = (currentDoc?.id === doc.id);
                const isSpecialVersion = doc.code === '00_版本資訊';

                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        setTimeout(() => {
                          const previewEl = document.getElementById('platform-manual-preview-section');
                          if (previewEl) {
                            previewEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }
                        }, 50);
                      }
                    }}
                    className={`group p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 active:scale-98 ${
                      isSelected
                        ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-400/50 text-stone-950 font-bold shadow-xs'
                        : isSpecialVersion
                        ? 'bg-amber-50/50 hover:bg-amber-50 border-amber-200/80 text-stone-800'
                        : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2.5 w-full">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-amber-500 text-stone-950 shadow-xs'
                              : isSpecialVersion
                              ? 'bg-amber-400/30 text-amber-800'
                              : 'bg-stone-100 group-hover:bg-stone-200/80 text-stone-600'
                          }`}
                        >
                          {renderIcon(doc.icon, doc.color)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                              {doc.code}
                            </h4>
                            {doc.isCustom && (
                              <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                                自訂
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500 truncate mt-0.5">
                            {doc.modules.length} 個模組 • {doc.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {doc.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteDoc(doc.id, e)}
                            className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="刪除此檔案"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ChevronRight className={`w-4 h-4 transition-all ${
                          isSelected ? 'text-amber-800 translate-x-0.5 font-bold' : 'text-stone-300 group-hover:text-amber-600'
                        }`} />
                      </div>
                    </div>

                    {/* 00_版本資訊 清單區即時簡覽 (同一份文件記錄最早到未來的每個版本) */}
                    {isSpecialVersion && (
                      <div className="pt-2 border-t border-amber-200/70 text-[10px] space-y-1.5 w-full">
                        <div className="flex items-center justify-between font-mono font-bold text-amber-950">
                          <span className="bg-amber-200/90 text-amber-950 px-1.5 py-0.5 rounded text-[10px]">
                            {versionState.currentVersion} ({versionState.seqNumber})
                          </span>
                          <span className="text-[10px] text-stone-600">
                            最後更新：{versionState.lastReleaseDate} {versionState.lastReleaseTime}
                          </span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-white/80 border border-amber-200/60 text-[10px] text-stone-700 leading-tight">
                          <div className="font-bold text-amber-950 flex items-center justify-between">
                            <span>最新版本更新重點：</span>
                            <span className="text-[9px] font-normal text-stone-500">#{INITIAL_VERSION_LOGS[0]?.seqNumber}</span>
                          </div>
                          <p className="text-stone-600 line-clamp-2 mt-0.5">
                            {INITIAL_VERSION_LOGS[0]?.summary}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-amber-900 font-bold pt-0.5">
                          <span>已收錄全歷史 {INITIAL_VERSION_LOGS.length} 個版本 (最早 09/22 專案啟動)</span>
                          <span className="text-amber-700 underline underline-offset-2">點選調閱與下載 →</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. 文件內容即時預覽區 (Desktop on Right, Mobile on Bottom) */}
          <div
            id="platform-manual-preview-section"
            className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-4 sm:space-y-5 bg-white min-h-0"
          >
            {/* 預覽提示標頭 */}
            <div className="flex items-center justify-between pb-2.5 border-b border-stone-200 text-xs text-stone-500">
              <span className="font-bold flex items-center gap-1.5 text-stone-800">
                <Eye className="w-4 h-4 text-amber-500" />
                <span className="hidden md:inline">平台清單即時預覽（電腦版在右側）</span>
                <span className="md:hidden">平台清單即時預覽（手機板在下方）</span>
              </span>
              {currentDoc && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 font-black text-xs border border-amber-300 shadow-2xs">
                  正在預覽：{currentDoc.code}
                </span>
              )}
            </div>

            {currentDoc ? (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Document Top Header & Action Controls */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-50 via-white to-amber-50/20 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <span className="text-xs font-black text-amber-600 uppercase tracking-wider">
                      {currentDoc.code.slice(0, 2)} • 規格模組
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-stone-900 mt-0.5">
                      【{currentDoc.title.replace(/^[0-9]+_/, '')}】 與維護規則
                    </h3>
                    <p className="text-xs text-stone-500 mt-1">
                      {currentDoc.subtitle}
                    </p>
                  </div>

                  {/* Action Buttons: 複製文字、下載 Word 檔（移除已劃叉之文字檔下載） */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleCopyText(currentDoc)}
                      className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 hover:border-amber-300 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
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
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="下載 Word (.doc) 檔"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>下載 Word 檔</span>
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
                  <div className="space-y-4">
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-amber-900 block">
                          當前運行版本 (Production)
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadAllVersionLogsAsMarkdown(INITIAL_VERSION_LOGS)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title="下載從最早到最新所有版本的完整歷程 (.md)"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>下載全版本歷程總清單 (.md)</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-3 py-1 rounded-xl bg-stone-900 text-amber-400 font-mono font-black text-sm shadow-xs">
                          序號 {versionState.seqNumber}
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-stone-950 font-mono">
                          {versionState.currentVersion}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-xs text-stone-600 font-medium font-mono">
                          最後更新：{versionState.lastReleaseDate} {versionState.lastReleaseTime} (UTC+8)
                        </span>
                      </div>
                      <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2 text-xs text-emerald-800 font-bold flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>單日 0.2.0 與字母單獨記數規範運作中 • 最後更新依發布時戳靜態記錄</span>
                        </div>
                        <span className="text-[11px] text-stone-500 font-mono">
                          共收錄 {INITIAL_VERSION_LOGS.length} 個歷史版本（最早 09/22 專案啟動）
                        </span>
                      </div>
                    </div>

                    {/* 完整歷史版本清單（隨時調閱、逐版下載） */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-600" />
                          <h4 className="text-sm font-black text-stone-900">
                            歷史版本歷程清單（隨時調閱、逐版下載）
                          </h4>
                        </div>
                        <span className="text-[10px] text-stone-500">
                          同一份文件持續累加記錄最新至最早之全部更動
                        </span>
                      </div>

                      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                        {INITIAL_VERSION_LOGS.map((log) => (
                          <div
                            key={log.seqNumber}
                            className="p-3.5 rounded-xl bg-white border border-stone-200 hover:border-amber-300 transition-colors space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-stone-900 text-amber-400 font-mono font-bold text-xs">
                                  {log.seqNumber}
                                </span>
                                <span className="font-mono font-bold text-sm text-stone-900">
                                  {log.version}
                                </span>
                                <span className="text-[11px] text-stone-500 font-mono">
                                  {log.releaseDate} {log.releaseTime} (UTC+8)
                                </span>
                                <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-medium">
                                  {log.author}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => downloadVersionLogAsMarkdown(log)}
                                className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                                title={`下載 ${log.seqNumber} (${log.version}) 變更紀錄 (.md)`}
                              >
                                <Download className="w-3 h-3" />
                                <span>下載此版紀錄 (.md)</span>
                              </button>
                            </div>

                            <p className="text-xs font-semibold text-stone-800 leading-snug">
                              {log.summary}
                            </p>

                            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-stone-600 pl-1 leading-relaxed">
                              {log.changes.map((change, cIdx) => (
                                <li key={cIdx}>{change}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Modules List */}
                <div className="space-y-3.5 sm:space-y-4">
                  {currentDoc.modules.map((mod, idx) => (
                    <div
                      key={mod.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2.5 hover:border-amber-200 transition-colors"
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
            ) : (
              <div className="py-16 text-center text-stone-400 text-sm">
                請由目錄選取文件以預覽內容
              </div>
            )}
          </div>
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
