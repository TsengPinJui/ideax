import React, { useState, useRef, useEffect } from 'react';
import {
  FolderArchive,
  Upload,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  FileText,
  ShieldCheck,
  Cpu,
  Scale,
  Users,
  Wrench,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sparkles,
  X,
  RotateCcw,
  FileCode,
  FileUp,
  Tag,
  Bookmark,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import {
  loadAllManualDocuments,
  saveCustomManualFile,
  deleteManualFileById,
  restoreAllSystemDefaultFiles,
  getDeletedSystemIds,
  initManualFilesFromFirestore,
  PlatformManualDoc,
} from '../data/platformManual/fileStorage';
import { subscribeToCustomManualFiles } from '../services/firestoreSync';
import { APP_VERSION, APP_RELEASE_DATE } from '../data/versionData';
import {
  downloadEntireManualFolderZip,
  downloadEntireManualFolderTar,
  downloadEntireManualFolderWord,
  downloadEntireManualFolderPdf,
  downloadEntireManualFolderJson,
  getPlatformManualFolderName,
  downloadDocAsWord,
  downloadDocAsPdf,
  downloadDocAsText,
  formatDocToMarkdown,
} from '../utils/zipManualDownloader';
import { useApp } from '../context/AppContext';

interface AdminPlatformManualCardProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const AdminPlatformManualCard: React.FC<AdminPlatformManualCardProps> = ({
  onClose,
  isModal = false,
}) => {
  const { currentUser } = useApp();

  // 權限嚴格阻截：非管理員身分一律不予渲染
  if (currentUser.role !== 'admin') {
    return null;
  }

  const [documents, setDocuments] = useState<PlatformManualDoc[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('00_version_info');
  const [copied, setCopied] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [deletedSystemCount, setDeletedSystemCount] = useState<number>(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    '0': true,
    '1': true,
  });

  // Modal / Form state for creating a new custom document
  const [isCreatingNewDoc, setIsCreatingNewDoc] = useState<boolean>(false);
  const [newDocTitle, setNewDocTitle] = useState<string>('');
  const [newDocDesc, setNewDocDesc] = useState<string>('');
  const [newDocContent, setNewDocContent] = useState<string>('');

  // Delete confirmation modal state
  const [fileToDelete, setFileToDelete] = useState<PlatformManualDoc | null>(null);

  // Cloud Sync state
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Multi-format folder download & PDF download state
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [folderMenuOpen, setFolderMenuOpen] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const folderMenuRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 點擊外部關閉資料夾格式選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(event.target as Node)) {
        setFolderMenuOpen(false);
      }
    };
    if (folderMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [folderMenuOpen]);

  // 載入當前文件清單
  const refreshDocuments = () => {
    const docs = loadAllManualDocuments();
    setDocuments(docs);
    setDeletedSystemCount(getDeletedSystemIds().length);
    if (docs.length > 0 && !docs.some((d) => d.id === selectedDocId)) {
      setSelectedDocId(docs[0].id);
    }
  };

  // 手動自雲端重新同步
  const handleManualCloudSync = async () => {
    setIsSyncingCloud(true);
    setSyncStatusMsg('正在自 Firebase 雲端資料庫同步手冊檔案...');
    try {
      const docs = await initManualFilesFromFirestore();
      setDocuments(docs);
      setDeletedSystemCount(getDeletedSystemIds().length);
      setSyncStatusMsg(`雲端同步完成！共載入 ${docs.length} 份文件檔案`);
    } catch (e) {
      setSyncStatusMsg('雲端同步失敗，已切回本機快取');
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setSyncStatusMsg(null), 3500);
    }
  };

  useEffect(() => {
    refreshDocuments();

    // 啟動時自動自 Firebase 雲端資料庫加載最新自訂檔案與刪除設定
    setIsSyncingCloud(true);
    initManualFilesFromFirestore()
      .then((docs) => {
        setDocuments(docs);
        setDeletedSystemCount(getDeletedSystemIds().length);
      })
      .catch((e) => {
        console.warn('Initial cloud manual sync failed:', e);
      })
      .finally(() => {
        setIsSyncingCloud(false);
      });

    // 即時監聽 Firestore 雲端集合變化
    const unsub = subscribeToCustomManualFiles((cloudFiles) => {
      if (cloudFiles && Array.isArray(cloudFiles)) {
        refreshDocuments();
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const currentDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 檔案上傳處理 (支援多選、.docx, .doc, .md, .txt, .pdf, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 850 * 1024) {
        alert(
          `提醒：檔案「${file.name}」大小為 ${(file.size / 1024).toFixed(0)} KB，超出 Firestore 雲端資料庫單筆文檔 1MB 建議上限。建議轉為純文字/Markdown 或壓縮至 800KB 以下，以確保完整持久化存入資料庫！`
        );
      }

      const isText = file.type.startsWith('text/') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.yaml') ||
        file.name.endsWith('.yml');

      const isWord = file.name.endsWith('.docx') || file.name.endsWith('.doc') || file.type.includes('word') || file.type.includes('officedocument');
      const isPdf = file.name.endsWith('.pdf') || file.type === 'application/pdf';

      const sizeFormatted = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;

      const reader = new FileReader();

      if (isText) {
        reader.onload = (event) => {
          const content = (event.target?.result as string) || '';
          const newDoc: PlatformManualDoc = {
            id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            title: file.name.replace(/\.[^/.]+$/, ''),
            description: `自訂文字檔案 (${sizeFormatted})`,
            fileType: file.name.endsWith('.md') ? 'markdown' : 'text',
            content,
            sizeFormatted,
            isCustom: true,
          };
          saveCustomManualFile(newDoc);
          refreshDocuments();
          setSelectedDocId(newDoc.id);
          setSyncStatusMsg(`檔案「${newDoc.name}」已儲存並自動同步至雲端資料庫！`);
          setTimeout(() => setSyncStatusMsg(null), 4000);
        };
        reader.readAsText(file);
      } else {
        reader.onload = (event) => {
          const dataUrl = (event.target?.result as string) || '';
          const newDoc: PlatformManualDoc = {
            id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            title: file.name.replace(/\.[^/.]+$/, ''),
            description: `自訂文件檔案 (${sizeFormatted})`,
            fileType: isWord ? 'word' : isPdf ? 'pdf' : 'document',
            dataUrl,
            sizeFormatted,
            isCustom: true,
          };
          saveCustomManualFile(newDoc);
          refreshDocuments();
          setSelectedDocId(newDoc.id);
          setSyncStatusMsg(`檔案「${newDoc.name}」已儲存並自動同步至雲端資料庫！`);
          setTimeout(() => setSyncStatusMsg(null), 4000);
        };
        reader.readAsDataURL(file);
      }
    });

    if (e.target) {
      e.target.value = '';
    }
  };

  // 儲存手動建立的文件
  const handleSaveNewCustomDoc = () => {
    if (!newDocTitle.trim()) return;

    const newDoc: PlatformManualDoc = {
      id: `custom_doc_${Date.now()}`,
      name: `${newDocTitle.trim()}.md`,
      title: newDocTitle.trim(),
      description: newDocDesc.trim() || '管理員線上建立之手冊筆記',
      fileType: 'markdown',
      content: newDocContent || `# ${newDocTitle.trim()}\n\n${newDocDesc.trim()}`,
      sizeFormatted: `${Math.max(1, Math.round((newDocContent.length || 10) / 1024))} KB`,
      isCustom: true,
    };

    saveCustomManualFile(newDoc);
    refreshDocuments();
    setSelectedDocId(newDoc.id);
    setIsCreatingNewDoc(false);
    setNewDocTitle('');
    setNewDocDesc('');
    setNewDocContent('');
    setSyncStatusMsg(`檔案「${newDoc.name}」已建立並自動同步至雲端資料庫！`);
    setTimeout(() => setSyncStatusMsg(null), 4000);
  };

  // 執行刪除檔案
  const confirmDeleteFile = () => {
    if (!fileToDelete) return;
    deleteManualFileById(fileToDelete.id, !!fileToDelete.isCustom);
    setFileToDelete(null);
    refreshDocuments();
  };

  // 恢復被刪除之系統預設檔案
  const handleRestoreDefaults = () => {
    restoreAllSystemDefaultFiles();
    refreshDocuments();
  };

  // 單檔下載
  // 單檔下載純文字檔 (.txt / .md)
  const handleDownloadTextFile = (doc: PlatformManualDoc, ext: 'txt' | 'md' = 'txt') => {
    if (doc.dataUrl) {
      const link = document.createElement('a');
      link.href = doc.dataUrl;
      link.setAttribute('download', doc.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    downloadDocAsText(doc, ext);
  };

  // 單檔下載 Word 檔 (.doc)
  const handleDownloadWordFile = (doc: PlatformManualDoc) => {
    if (doc.dataUrl) {
      const link = document.createElement('a');
      link.href = doc.dataUrl;
      link.setAttribute('download', doc.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    downloadDocAsWord(doc);
  };

  // 單檔下載 PDF 檔 (.pdf)
  const handleDownloadPdfFile = async (doc: PlatformManualDoc) => {
    setIsDownloadingPdf(true);
    try {
      await downloadDocAsPdf(doc);
    } catch (e) {
      console.error('Failed to download PDF', e);
      downloadDocAsText(doc, 'txt');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // 下載整個資料夾（支援 ZIP, TAR, Word全手冊, PDF全手冊, JSON備份）
  const handleDownloadEntireFolder = async (format: 'zip' | 'tar' | 'word' | 'pdf' | 'json') => {
    if (documents.length === 0 || downloadingFormat) return;
    setDownloadingFormat(format);
    setFolderMenuOpen(false);
    try {
      if (format === 'zip') {
        await downloadEntireManualFolderZip(documents);
      } else if (format === 'tar') {
        await downloadEntireManualFolderTar(documents);
      } else if (format === 'word') {
        downloadEntireManualFolderWord(documents);
      } else if (format === 'pdf') {
        await downloadEntireManualFolderPdf(documents);
      } else if (format === 'json') {
        downloadEntireManualFolderJson(documents);
      }
      setSyncStatusMsg(`已成功下載「${format.toUpperCase()}」格式的資料夾清單！`);
      setTimeout(() => setSyncStatusMsg(null), 3500);
    } catch (e) {
      console.error(`Download folder ${format} failed`, e);
      setSyncStatusMsg(`下載 ${format.toUpperCase()} 失敗，請重試`);
      setTimeout(() => setSyncStatusMsg(null), 3500);
    } finally {
      setDownloadingFormat(null);
    }
  };

  // 複製全文文字
  const handleCopyCurrentMarkdown = async () => {
    if (!currentDoc) return;
    try {
      const text = formatDocToMarkdown(currentDoc);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const getDocIcon = (doc: PlatformManualDoc) => {
    if (doc.code === '00') return <Tag className="w-4 h-4 text-amber-500" />;
    if (doc.code === '01') return <Users className="w-4 h-4 text-blue-500" />;
    if (doc.code === '02') return <Sparkles className="w-4 h-4 text-amber-500" />;
    if (doc.code === '03') return <Scale className="w-4 h-4 text-emerald-500" />;
    if (doc.code === '04') return <Cpu className="w-4 h-4 text-purple-500" />;
    if (doc.code === '05') return <Wrench className="w-4 h-4 text-rose-500" />;
    if (doc.fileType === 'word') return <FileText className="w-4 h-4 text-blue-600" />;
    if (doc.fileType === 'pdf') return <FileText className="w-4 h-4 text-rose-600" />;
    return <FileText className="w-4 h-4 text-indigo-500" />;
  };

  const containerContent = (
    <div className={`rounded-3xl border border-stone-200/90 bg-gradient-to-b from-stone-50 via-white to-stone-50 p-4 sm:p-6 shadow-sm space-y-4 ${isModal ? 'max-h-[88vh] overflow-y-auto' : ''}`}>
      {/* 隱藏式檔案上傳 Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept=".docx,.doc,.txt,.md,.pdf,.csv"
        className="hidden"
      />

      {/* 頂部標題與工具按鈕（無時間壓印，直接名為：平台內部清單） */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center shrink-0 shadow-xs ring-4 ring-amber-400/10">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                平台內部清單
              </h3>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-stone-900 text-amber-300">
                v{APP_VERSION}
              </span>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80">
                {APP_RELEASE_DATE}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                共 {documents.length} 份文件檔案
              </span>
              {isSyncingCloud ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                  雲端同步中...
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200"
                  title="所有新增與上傳之手冊檔案均自動持久化儲存至 Firebase Firestore 雲端資料庫"
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  Firestore 雲端持久儲存
                </span>
              )}
            </div>
            <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="text-stone-400 font-medium">資料夾名稱：</span>
              <code className="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-800 font-mono font-bold text-[11px] select-all border border-stone-200">
                {getPlatformManualFolderName()}
              </code>
            </div>
            <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
              可自由在線查閱、<strong>上傳新增檔案</strong>、<strong>手動建立文件</strong>或<strong>刪除不需要的檔案</strong>。檔案會自動同步保存至 Firebase 雲端資料庫。
            </p>
          </div>
        </div>

        {/* 頂部管理按鈕群組 */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* 手動自雲端重新同步按鈕 */}
          <button
            type="button"
            disabled={isSyncingCloud}
            onClick={handleManualCloudSync}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 active:scale-95 text-stone-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs border border-stone-200 transition-all cursor-pointer disabled:opacity-60"
            title="自 Firebase Firestore 雲端資料庫重新同步手冊與檔案清單"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-stone-600 ${isSyncingCloud ? 'animate-spin text-amber-600' : ''}`} />
            <span className="hidden sm:inline">重新同步雲端</span>
          </button>

          {/* 下載整個資料夾按鈕（支援 ZIP, TAR, Word全手冊, PDF全手冊, JSON備份） */}
          <div className="relative" ref={folderMenuRef}>
            <div className="inline-flex rounded-xl shadow-xs">
              <button
                type="button"
                disabled={!!downloadingFormat || documents.length === 0}
                onClick={() => handleDownloadEntireFolder('zip')}
                className="px-3.5 py-1.5 rounded-l-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border-t border-b border-l border-amber-400 disabled:opacity-60"
                title="一鍵打包下載整個資料夾 (.zip)"
              >
                {downloadingFormat === 'zip' ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>打包 ZIP 中...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>下載整個資料夾 (.zip)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={!!downloadingFormat || documents.length === 0}
                onClick={() => setFolderMenuOpen(!folderMenuOpen)}
                className="px-2.5 py-1.5 rounded-r-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 text-xs font-black flex items-center justify-center border-t border-b border-r border-amber-400 transition-all cursor-pointer disabled:opacity-60 border-l border-amber-600/20"
                title="選擇其他資料夾下載格式 (.tar, .doc, .pdf, .json)"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${folderMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* 下拉選單：多種類型的資料夾下載 */}
            {folderMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-72 rounded-2xl bg-white border border-stone-200 shadow-xl py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1">
                <div className="px-3.5 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 flex items-center justify-between">
                  <span>📁 資料夾打包格式</span>
                  <span className="text-[10px] font-mono text-stone-500">共 {documents.length} 份文件</span>
                </div>

                {/* 1. ZIP */}
                <button
                  type="button"
                  onClick={() => handleDownloadEntireFolder('zip')}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-amber-50/80 text-stone-800 font-bold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono text-[10px] font-black border border-amber-300">ZIP</span>
                    <div>
                      <div className="text-xs font-bold text-stone-900">ZIP 壓縮資料夾 (.zip)</div>
                      <div className="text-[10px] text-stone-500 font-normal">標準壓縮包，包含 Word 與純文字檔</div>
                    </div>
                  </div>
                  {downloadingFormat === 'zip' && <RotateCcw className="w-3.5 h-3.5 animate-spin text-amber-600" />}
                </button>

                {/* 2. TAR */}
                <button
                  type="button"
                  onClick={() => handleDownloadEntireFolder('tar')}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-amber-50/80 text-stone-800 font-bold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-stone-200 text-stone-900 font-mono text-[10px] font-black border border-stone-300">TAR</span>
                    <div>
                      <div className="text-xs font-bold text-stone-900">TAR 歸檔資料夾 (.tar)</div>
                      <div className="text-[10px] text-stone-500 font-normal">POSIX / Linux 標準免解壓直接歸檔</div>
                    </div>
                  </div>
                  {downloadingFormat === 'tar' && <RotateCcw className="w-3.5 h-3.5 animate-spin text-amber-600" />}
                </button>

                {/* 3. Word 全手冊 */}
                <button
                  type="button"
                  onClick={() => handleDownloadEntireFolder('word')}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50/80 text-stone-800 font-bold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-900 font-mono text-[10px] font-black border border-blue-300">DOC</span>
                    <div>
                      <div className="text-xs font-bold text-stone-900">全手冊彙整 Word 檔 (.doc)</div>
                      <div className="text-[10px] text-stone-500 font-normal">全部章節與文件合併為單一完整 Word</div>
                    </div>
                  </div>
                  {downloadingFormat === 'word' && <RotateCcw className="w-3.5 h-3.5 animate-spin text-blue-600" />}
                </button>

                {/* 4. PDF 全手冊 */}
                <button
                  type="button"
                  onClick={() => handleDownloadEntireFolder('pdf')}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-rose-50/80 text-stone-800 font-bold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-900 font-mono text-[10px] font-black border border-rose-300">PDF</span>
                    <div>
                      <div className="text-xs font-bold text-stone-900">全手冊彙整 PDF 檔 (.pdf)</div>
                      <div className="text-[10px] text-stone-500 font-normal">全部章節合併為單一 A4 完整列印手冊</div>
                    </div>
                  </div>
                  {downloadingFormat === 'pdf' && <RotateCcw className="w-3.5 h-3.5 animate-spin text-rose-600" />}
                </button>

                {/* 5. JSON 備份 */}
                <button
                  type="button"
                  onClick={() => handleDownloadEntireFolder('json')}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-purple-50/80 text-stone-800 font-bold flex items-center justify-between cursor-pointer transition-colors border-t border-stone-100"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-900 font-mono text-[10px] font-black border border-purple-300">JSON</span>
                    <div>
                      <div className="text-xs font-bold text-stone-900">全清單備份資料 (.json)</div>
                      <div className="text-[10px] text-stone-500 font-normal">包含所有手冊內容與系統結構備份</div>
                    </div>
                  </div>
                  {downloadingFormat === 'json' && <RotateCcw className="w-3.5 h-3.5 animate-spin text-purple-600" />}
                </button>
              </div>
            )}
          </div>

          {/* 上傳檔案按鈕 */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="上傳外部文件檔案 (.md, .txt, .json, .pdf, .docx, .csv)"
          >
            <Upload className="w-3.5 h-3.5 text-stone-600" />
            <span>上傳檔案</span>
          </button>

          {/* 新增筆記/文件按鈕 */}
          <button
            type="button"
            onClick={() => setIsCreatingNewDoc(true)}
            className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="手動建立新的手冊章節或營運規範"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增文件</span>
          </button>

          {/* 恢復被刪除的系統預設檔案 */}
          {deletedSystemCount > 0 && (
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1.5 border border-stone-200 transition-all cursor-pointer"
              title="恢復被隱藏或刪除的系統預設規格檔案"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
              <span>恢復預設 ({deletedSystemCount})</span>
            </button>
          )}

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer ml-1"
              title="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 雲端即時同步提示條 */}
      {syncStatusMsg && (
        <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncStatusMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncStatusMsg(null)}
            className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 📁 互動式檔案資料夾與檔案預覽區 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 左側：檔案清單與上傳入口 */}
        <div className="lg:col-span-4 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              📁 檔案目錄（點擊切換查閱）
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
            >
              <FileUp className="w-3 h-3" />
              <span>快速上傳</span>
            </button>
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {documents.map((doc) => {
              const isSelected = doc.id === selectedDocId;
              return (
                <div
                  key={doc.id}
                  className={`w-full rounded-2xl border transition-all flex items-center justify-between p-2.5 gap-2 group ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-300 text-stone-900 ring-1 ring-amber-400/40 shadow-xs'
                      : 'bg-white hover:bg-stone-50 border-stone-200/80 text-stone-600'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDocId(doc.id)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-amber-500 text-stone-950 border-amber-400'
                          : 'bg-stone-100 text-stone-600 border-stone-200'
                      }`}
                    >
                      {getDocIcon(doc)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black truncate flex items-center gap-1">
                        <span className="truncate">{doc.name}</span>
                        {doc.isCustom && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-normal shrink-0">
                            自訂
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate">
                        {doc.sizeFormatted || (doc.itemCount ? `${doc.itemCount} 個模組` : '文字文件')}
                      </div>
                    </div>
                  </button>

                  {/* 刪除按鈕 (支援刪除系統檔案與自訂上傳檔案) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileToDelete(doc);
                    }}
                    className="p-1.5 rounded-lg text-stone-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    title={`刪除「${doc.name}」`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* 拖曳或點擊上傳提示區域 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 rounded-2xl border-2 border-dashed border-stone-200 hover:border-amber-400 bg-stone-50/60 hover:bg-amber-50/30 transition-all text-center cursor-pointer group"
          >
            <Upload className="w-5 h-5 mx-auto text-stone-400 group-hover:text-amber-600 mb-1 transition-colors" />
            <div className="text-xs font-bold text-stone-700 group-hover:text-amber-800">
              點擊上傳新檔案至內部清單
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              支援 .docx, .doc, .md, .txt, .pdf, .csv
            </div>
          </div>
        </div>

        {/* 右側：當前選取檔案之詳細內容預覽與操作 */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-4">
          {currentDoc ? (
            <>
              {/* 檔案頭部資訊與單檔操作 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-700 font-mono tracking-wider uppercase">
                      {currentDoc.code ? `${currentDoc.code} • 規格模組` : (currentDoc.isCustom ? '自訂上傳檔案' : '平台模組')}
                    </span>
                    {currentDoc.sizeFormatted && (
                      <span className="text-[10px] text-stone-400 font-mono">
                        ({currentDoc.sizeFormatted})
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-black text-stone-900 mt-0.5 truncate">{currentDoc.title}</h4>
                  <p className="text-xs text-stone-500 mt-0.5 truncate">{currentDoc.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* 複製文字 */}
                  <button
                    type="button"
                    onClick={handleCopyCurrentMarkdown}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    title="複製此檔案文字內容"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">已複製！</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-stone-500" />
                        <span>複製文字</span>
                      </>
                    )}
                  </button>

                  {/* 下載 Word 檔 (.doc) */}
                  <button
                    type="button"
                    onClick={() => handleDownloadWordFile(currentDoc)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    title="以 Word 相容檔 (.doc) 下載此檔案，可直接使用 Office Word 或 WPS 開啟"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>下載 Word 檔</span>
                  </button>

                  {/* 下載 PDF 檔 (.pdf) */}
                  <button
                    type="button"
                    disabled={isDownloadingPdf}
                    onClick={() => handleDownloadPdfFile(currentDoc)}
                    className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                    title="以 PDF 格式 (.pdf) 下載此文件"
                  >
                    {isDownloadingPdf ? (
                      <RotateCcw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span>{isDownloadingPdf ? '產生中...' : '下載PDF'}</span>
                  </button>

                  {/* 刪除此檔 */}
                  <button
                    type="button"
                    onClick={() => setFileToDelete(currentDoc)}
                    className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 transition-colors cursor-pointer"
                    title="刪除此檔案"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 檔案本體檢視區 */}
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {/* 1. 自訂純文字 / Markdown 檔案檢視 */}
                {currentDoc.content && (
                  <div className="p-4 rounded-xl bg-stone-50/70 border border-stone-200 font-mono text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">
                    {currentDoc.content}
                  </div>
                )}

                {/* 2. PDF 或無法直接預覽之二進位檔案 */}
                {currentDoc.dataUrl && !currentDoc.content && (
                  <div className="p-8 rounded-2xl bg-stone-50 text-center space-y-3 border border-stone-200">
                    <FileText className="w-12 h-12 mx-auto text-amber-500" />
                    <div>
                      <div className="text-sm font-bold text-stone-900">{currentDoc.name}</div>
                      <div className="text-xs text-stone-500 mt-1">此檔案為附件格式，支援隨時下載或保存。</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadTextFile(currentDoc)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>下載原檔 ({currentDoc.sizeFormatted || '附件'})</span>
                    </button>
                  </div>
                )}

                {/* 0. 系統模組：00 版本資訊與維護規則 */}
                {currentDoc.id === '00_version_info' && (
                  <div className="space-y-4">
                    {/* 頂部版本狀態 */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-300/80 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-xs font-bold text-amber-800">當前運行版本 (Production)</div>
                        <div className="text-lg font-black text-stone-900 flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs font-mono font-black bg-stone-900 text-amber-300 px-2.5 py-1 rounded-lg">
                            序號 {currentDoc.data?.history?.[0]?.seqCode || '#005'}
                          </span>
                          <span>v{APP_VERSION}</span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                            最後更新：{APP_RELEASE_DATE}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                          ● 單日 0.2.0 與字母單獨記數規範運作中
                        </span>
                      </div>
                    </div>

                    {/* 版本推進與治理規則守則 */}
                    <div className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50/40">
                      <div className="p-3 bg-stone-100/80 font-black text-xs text-stone-900 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-amber-600" />
                        <span>📜 版本號推進與治理規則守則</span>
                      </div>
                      <div className="p-3.5 space-y-2.5 bg-white text-xs">
                        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black">1</span>
                            <span>單日版本增量上限 (Daily Cap: 0.2.0)</span>
                          </div>
                          <p className="text-stone-600 text-[11px] leading-relaxed pl-6.5">
                            同一天內常態更新，版本號 Minor 遞增上限嚴格限制為 <strong>+0.2.0</strong>（例如當前為 1.5.2，單日最高只推進至 1.7.2）。
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black">2</span>
                            <span>達上限後之後綴擴充機制</span>
                          </div>
                          <p className="text-stone-600 text-[11px] leading-relaxed pl-6.5">
                            若單日已達 0.2.0 增量上限，當日後續之版本更新自動在版本尾端追加小寫英文字母（例如單日第 21 次更新為 <strong>v1.7.2a</strong>，依序為 v1.7.2b、v1.7.2c ...），並於版號紀錄中載明「已達單日 0.2.0 上限，改以字母遞增」。
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black">3</span>
                            <span>隔日啟動與重置原則</span>
                          </div>
                          <p className="text-stone-600 text-[11px] leading-relaxed pl-6.5">
                            跨日（次日）之第一次更新，自動解除小寫字母後綴，並以末位 Patch +1 啟動（例如前日最高為 v1.7.2a，隔日第一次更新即以 <strong>v1.7.3</strong> 起算），同時重置當日 0.2.0 的可用增量額度。
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black">4</span>
                            <span>重大更新內容註記</span>
                          </div>
                          <p className="text-stone-600 text-[11px] leading-relaxed pl-6.5">
                            凡涉及架構演進、核心金流調配、法規安全審核、系統全新模組發布之改動，需特別標註【重大更新】並條列核心亮點。
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 版本更新歷程清單 */}
                    <div className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50/40">
                      <div className="p-3 bg-stone-100/80 font-black text-xs text-stone-900 flex items-center gap-2">
                        <FolderArchive className="w-4 h-4 text-amber-600" />
                        <span>🕒 平台版本更新歷程紀錄 (Changelog)</span>
                      </div>
                      <div className="p-3 space-y-3 bg-white">
                        {currentDoc.data?.history?.map((log: any, lIdx: number) => (
                          <div key={lIdx} className="p-3 rounded-xl border border-stone-200/80 bg-stone-50/40 space-y-1.5">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-mono font-black text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded border border-amber-300">
                                  {log.seqCode || `#00${log.seq}`}
                                </span>
                                <span className="text-xs font-mono font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  v{log.version}
                                </span>
                                {log.letterSuffix && (
                                  <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                    擴充 #{log.letterSeq} [{log.letterSuffix}]
                                  </span>
                                )}
                                <span className="text-xs font-black text-stone-900">{log.title}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {log.isMajor && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                                    🔥 重大更新
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-stone-400">{log.date}</span>
                              </div>
                            </div>
                            <div className="text-xs text-stone-600 leading-relaxed">{log.summary}</div>
                            <ul className="list-disc list-inside text-[11px] text-stone-600 space-y-0.5 pt-1 pl-1">
                              {log.changes?.map((ch: string, cIdx: number) => (
                                <li key={cIdx}>{ch}</li>
                              ))}
                            </ul>
                            {log.note && (
                              <div className="text-[10px] text-amber-800 bg-amber-50/80 p-2 rounded-lg border border-amber-200 mt-1">
                                💡 <strong>備註</strong>：{log.note}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. 系統模組：01 操作手冊 */}
                {currentDoc.id === '01_operations' &&
                  currentDoc.data?.sections?.map((sec: any, idx: number) => {
                    const isOpen = expandedSections[`op_${idx}`] !== false;
                    return (
                      <div key={idx} className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50/40">
                        <button
                          type="button"
                          onClick={() => toggleSection(`op_${idx}`)}
                          className="w-full p-3 bg-stone-100/70 hover:bg-stone-100 text-left font-bold text-xs text-stone-900 flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-amber-600" />
                            <span>{sec.role}</span>
                          </span>
                          {isOpen ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
                        </button>
                        {isOpen && (
                          <div className="p-3 space-y-2.5 bg-white">
                            {sec.steps.map((st: any, sIdx: number) => (
                              <div key={sIdx} className="text-xs space-y-0.5 border-l-2 border-amber-300 pl-2.5 py-0.5">
                                <div className="font-bold text-stone-800">{st.name}</div>
                                <div className="text-stone-600 text-[11px] leading-relaxed">{st.description}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* 4. 系統模組：02 核心功能清單 */}
                {currentDoc.id === '02_features' &&
                  currentDoc.data?.modules?.map((mod: any, idx: number) => {
                    const isOpen = expandedSections[`feat_${idx}`] !== false;
                    return (
                      <div key={idx} className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50/40">
                        <button
                          type="button"
                          onClick={() => toggleSection(`feat_${idx}`)}
                          className="w-full p-3 bg-stone-100/70 hover:bg-stone-100 text-left font-bold text-xs text-stone-900 flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-600" />
                            <span>{mod.moduleName}</span>
                          </span>
                          {isOpen ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
                        </button>
                        {isOpen && (
                          <ul className="p-3 space-y-1.5 bg-white list-disc list-inside text-xs text-stone-700">
                            {mod.specs.map((sp: string, sIdx: number) => (
                              <li key={sIdx} className="text-[11px] leading-relaxed">
                                {sp}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}

                {/* 5. 系統模組：03 平台規則與運作邏輯 */}
                {currentDoc.id === '03_rules' &&
                  currentDoc.data?.rules?.map((rule: any, idx: number) => {
                    const isOpen = expandedSections[`rule_${idx}`] !== false;
                    return (
                      <div key={idx} className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50/40">
                        <button
                          type="button"
                          onClick={() => toggleSection(`rule_${idx}`)}
                          className="w-full p-3 bg-stone-100/70 hover:bg-stone-100 text-left font-bold text-xs text-stone-900 flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Scale className="w-4 h-4 text-emerald-600" />
                            <span>{rule.category}</span>
                          </span>
                          {isOpen ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
                        </button>
                        {isOpen && (
                          <ul className="p-3 space-y-1.5 bg-white list-disc list-inside text-xs text-stone-700">
                            {rule.details.map((d: string, dIdx: number) => (
                              <li key={dIdx} className="text-[11px] leading-relaxed">
                                {d}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}

                {/* 6. 系統模組：04 技術架構 */}
                {currentDoc.id === '04_architecture' &&
                  currentDoc.data?.specifications?.map((spec: any, idx: number) => {
                    const isOpen = expandedSections[`arch_${idx}`] !== false;
                    return (
                      <div key={idx} className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50/40">
                        <button
                          type="button"
                          onClick={() => toggleSection(`arch_${idx}`)}
                          className="w-full p-3 bg-stone-100/70 hover:bg-stone-100 text-left font-bold text-xs text-stone-900 flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-purple-600" />
                            <span>{spec.domain}</span>
                          </span>
                          {isOpen ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
                        </button>
                        {isOpen && (
                          <ul className="p-3 space-y-1.5 bg-white list-disc list-inside text-xs text-stone-700">
                            {spec.points.map((p: string, pIdx: number) => (
                              <li key={pIdx} className="text-[11px] leading-relaxed">
                                {p}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}

                {/* 7. 系統模組：05 管理員維運守則 */}
                {currentDoc.id === '05_maintenance' &&
                  currentDoc.data?.protocols?.map((prot: any, idx: number) => {
                    const isOpen = expandedSections[`maint_${idx}`] !== false;
                    return (
                      <div key={idx} className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50/40">
                        <button
                          type="button"
                          onClick={() => toggleSection(`maint_${idx}`)}
                          className="w-full p-3 bg-stone-100/70 hover:bg-stone-100 text-left font-bold text-xs text-stone-900 flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-rose-600" />
                            <span>{prot.topic}</span>
                          </span>
                          {isOpen ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
                        </button>
                        {isOpen && (
                          <div className="p-3 space-y-2 bg-white text-xs text-stone-700">
                            {prot.steps.map((st: string, sIdx: number) => (
                              <div key={sIdx} className="text-[11px] leading-relaxed border-l-2 border-rose-300 pl-2">
                                {st}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-stone-400 text-xs">
              目前無選取任何檔案，請從左側點選或點擊「上傳檔案」。
            </div>
          )}
        </div>
      </div>

      {/* --- Modal 1: 線上建立新文件彈窗 --- */}
      {isCreatingNewDoc && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200 text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-600" />
                <span>新增手冊檔案或章節</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatingNewDoc(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">文件名稱 / 標題 *</label>
                <input
                  type="text"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="例如：營運應變演練守則、第三方金流備案..."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">簡要說明</label>
                <input
                  type="text"
                  value={newDocDesc}
                  onChange={(e) => setNewDocDesc(e.target.value)}
                  placeholder="一句話簡述本文件的用途與面向..."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">文件內文 (支援 Markdown)</label>
                <textarea
                  rows={6}
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder="# 標題&#10;&#10;請輸入詳細內文、SOP 步驟或清單..."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsCreatingNewDoc(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!newDocTitle.trim()}
                onClick={handleSaveNewCustomDoc}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-stone-950 text-xs font-black cursor-pointer shadow-xs"
              >
                確認儲存加入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Modal 2: 刪除確認彈窗 --- */}
      {fileToDelete && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-stone-200 text-stone-900">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-stone-900">確認刪除此檔案？</h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                即將從平台內部清單中移除「<span className="font-bold text-stone-800">{fileToDelete.name}</span>」。
                {fileToDelete.isCustom
                  ? '此自訂上傳檔案將被永久刪除。'
                  : '此為預設系統檔案，刪除後您可隨時點擊「恢復預設」重新取回。'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer flex-1"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer shadow-xs flex-1"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="max-w-4xl w-full">
          {containerContent}
        </div>
      </div>
    );
  }

  return containerContent;
};
