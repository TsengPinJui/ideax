import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  UploadCloud,
  Trash2,
  Download,
  FileText,
  FileCheck,
  RotateCcw,
  Plus,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
  Layers,
  Sparkles,
  Info,
  Calendar,
  User,
  Archive,
  Eye,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  CheatSheetManagedFile,
  getManagedCheatSheetFiles,
  saveManagedCheatSheetFile,
  deleteManagedCheatSheetFile,
  toggleManagedCheatSheetFileEnabled,
  restoreDefaultCheatSheetFiles,
  downloadSingleManagedFile,
  downloadManagedCompetitionPackage,
} from '../../services/cheatSheetFileManagerService';

interface AdminCheatSheetFileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminCheatSheetFileManagerModal: React.FC<AdminCheatSheetFileManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.accountType === 'admin';

  const [files, setFiles] = useState<CheatSheetManagedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [isTestingDownload, setIsTestingDownload] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New file form state
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState('');
  const [customFileDesc, setCustomFileDesc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reloadFiles = () => {
    setFiles(getManagedCheatSheetFiles());
  };

  useEffect(() => {
    if (isOpen) {
      reloadFiles();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleFilesChanged = () => {
      reloadFiles();
    };
    window.addEventListener('ideax_cheat_sheet_files_changed', handleFilesChanged);
    return () => {
      window.removeEventListener('ideax_cheat_sheet_files_changed', handleFilesChanged);
    };
  }, []);

  if (!isOpen) return null;

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 權限阻擋
  if (!isAdmin) {
    return (
      <div
        style={{ zIndex: 2147483648 }}
        className="fixed inset-0 bg-stone-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
      >
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 border border-stone-200 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-stone-900">權限不足</h3>
          <p className="text-xs text-stone-500">
            創星季懶人包檔案管理庫僅供 IdeaX 平台管理團隊使用，非管理員無權存取或修改。
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs"
          >
            關閉視窗
          </button>
        </div>
      </div>
    );
  }

  // 處理檔案選擇
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showToast('檔案大小超過 25MB 限制，請壓縮後再行存入', 'error');
      return;
    }

    setSelectedFileObj(file);
    setCustomFileName(file.name);
    setCustomFileDesc('');
  };

  // 確認存入檔案
  const handleSaveUpload = () => {
    if (!selectedFileObj) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const dataUrl = event.target?.result as string;
        const extension = selectedFileObj.name.split('.').pop()?.toLowerCase() || 'other';

        let detectedType = 'other';
        if (['doc', 'docx'].includes(extension)) detectedType = 'doc';
        else if (extension === 'pdf') detectedType = 'pdf';
        else if (['ppt', 'pptx'].includes(extension)) detectedType = 'presentation';
        else if (['zip', 'rar', '7z'].includes(extension)) detectedType = 'archive';
        else if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(extension)) detectedType = 'image';
        else if (['txt', 'md'].includes(extension)) detectedType = 'text';

        const finalName = customFileName.trim() || selectedFileObj.name;

        saveManagedCheatSheetFile({
          name: finalName,
          size: selectedFileObj.size,
          type: detectedType,
          category: 'custom_upload',
          uploadedBy: currentUser?.name || '管理員',
          contentDataUrl: dataUrl,
          description: customFileDesc.trim() || `由管理員 ${currentUser?.name || 'Admin'} 上傳存入`,
          isEnabled: true,
        });

        setSelectedFileObj(null);
        setCustomFileName('');
        setCustomFileDesc('');
        if (fileInputRef.current) fileInputRef.current.value = '';

        showToast(`已成功存入檔案「${finalName}」！前台懶人包下載包已同步納入。`, 'success');
      } catch (err) {
        console.error('Save file error:', err);
        showToast('存入檔案失敗，請稍後重試', 'error');
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setIsUploading(false);
      showToast('讀取檔案發生錯誤', 'error');
    };

    reader.readAsDataURL(selectedFileObj);
  };

  // 刪除檔案
  const handleDeleteFile = (fileId: string, fileName: string) => {
    deleteManagedCheatSheetFile(fileId);
    setDeleteConfirmId(null);
    showToast(`已將「${fileName}」自懶人包中刪除！`, 'info');
  };

  // 恢復預設官方檔案
  const handleRestoreDefaults = () => {
    restoreDefaultCheatSheetFiles();
    showToast('已成功恢復官方預設檔案章程！', 'success');
  };

  // 測試打包下載
  const handleTestDownloadPackage = async () => {
    try {
      setIsTestingDownload(true);
      await downloadManagedCompetitionPackage();
      showToast('測試打包下載已啟動！請檢視下載之 ZIP 壓縮包檔案內容。', 'success');
    } catch (e) {
      console.error(e);
      showToast('測試打包下載失敗', 'error');
    } finally {
      setIsTestingDownload(false);
    }
  };

  // 格式化檔案大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const enabledFilesCount = files.filter((f) => f.isEnabled).length;
  const totalPackageSizeBytes = files.filter((f) => f.isEnabled).reduce((acc, f) => acc + (f.size || 0), 0);

  return (
    <div
      style={{ zIndex: 2147483648 }}
      className="fixed inset-0 bg-stone-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl border-2 border-amber-300 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* 頂部 Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 p-4 sm:p-5 text-stone-950 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-950 text-amber-300 flex items-center justify-center shrink-0 shadow-md">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  創星季競賽懶人包檔案庫管理後台
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-950 text-amber-300 font-mono">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-stone-900/80 font-medium mt-0.5">
                管理員可直接存入或刪除懶人包內檔案；前台用戶下載 ZIP 時將自動動態打包此處之檔案清單。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-950/10 hover:bg-stone-950/20 text-stone-950 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 狀態提示 */}
        {toastMsg && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              toastMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : toastMsg.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-b border-rose-200'
                : 'bg-blue-50 text-blue-800 border-b border-blue-200'
            }`}
          >
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : toastMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* 主內容區 (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-stone-900 text-left">
          {/* 1. 存入新檔案區塊 (Upload & Save Card) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border-2 border-amber-300/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shadow-xs">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-stone-950">
                  存入新檔案至懶人包 (上傳自訂文件/簡報/章程)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                支援格式：Word, PDF, PPTX, ZIP, 圖片
              </span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              點擊或拖曳檔案至下方選擇區，可自訂檔案名稱與說明。存入後將立即進入懶人包資料庫，並在大眾點擊「打包下載」時一併打包提供！
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 items-start">
              <div className="sm:col-span-5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="admin-cheatsheet-file-input"
                  accept=".doc,.docx,.pdf,.ppt,.pptx,.xlsx,.csv,.zip,.png,.jpg,.jpeg,.txt,.md"
                />
                <label
                  htmlFor="admin-cheatsheet-file-input"
                  className={`w-full py-4 px-3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    selectedFileObj
                      ? 'border-emerald-400 bg-emerald-50/60 text-emerald-900'
                      : 'border-amber-400/90 bg-white hover:bg-amber-100/40 text-stone-700'
                  }`}
                >
                  <UploadCloud className={`w-5 h-5 ${selectedFileObj ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <span className="text-xs font-black truncate max-w-full">
                    {selectedFileObj ? `已選擇：${selectedFileObj.name}` : '點擊選擇本機檔案'}
                  </span>
                  <span className="text-[10px] text-stone-500">
                    {selectedFileObj ? `大小：${formatFileSize(selectedFileObj.size)}` : '單一檔案上限 25 MB'}
                  </span>
                </label>
              </div>

              <div className="sm:col-span-5 space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                    自訂儲存檔案名稱 (可修改檔名)
                  </label>
                  <input
                    type="text"
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                    placeholder="例如：2026創星季_完整參賽切結與FAQ.pdf"
                    disabled={!selectedFileObj}
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs text-stone-900 disabled:bg-stone-100 disabled:text-stone-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                    檔案用途備註（選填）
                  </label>
                  <input
                    type="text"
                    value={customFileDesc}
                    onChange={(e) => setCustomFileDesc(e.target.value)}
                    placeholder="例如：補充評選權重公式說明與團隊繳交範本"
                    disabled={!selectedFileObj}
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs text-stone-900 disabled:bg-stone-100 disabled:text-stone-400"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 pt-5">
                <button
                  type="button"
                  onClick={handleSaveUpload}
                  disabled={!selectedFileObj || isUploading}
                  className="w-full py-3 sm:py-7 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:bg-stone-200 disabled:text-stone-400 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-xs flex sm:flex-col items-center justify-center gap-1.5 border border-amber-600/30"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{isUploading ? '存入中...' : '確認存入'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. 目前懶人包內檔案清單 (Managed Files List) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-black text-stone-900">
                  目前懶人包打包檔案清單 ({files.length} 件檔案)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">
                  啟用納入打包：<strong className="text-stone-900">{enabledFilesCount}</strong> 件（預估總量 {formatFileSize(totalPackageSizeBytes)}）
                </span>
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="恢復預設的官方文字章程與視覺投影片"
                >
                  <RotateCcw className="w-3 h-3 text-stone-500" />
                  <span>重置官方預設</span>
                </button>
              </div>
            </div>

            {files.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-300 space-y-2">
                <FolderOpen className="w-8 h-8 text-stone-400 mx-auto" />
                <div className="text-xs font-bold text-stone-600">目前懶人包內無任何檔案</div>
                <p className="text-[11px] text-stone-400">
                  您可以點選上方「存入新檔案」或點選右上角「重置官方預設」恢復官方章程。
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => {
                  const isOfficial = file.category.startsWith('official_');
                  return (
                    <div
                      key={file.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        file.isEnabled
                          ? 'bg-white border-stone-200 hover:border-amber-300 shadow-2xs'
                          : 'bg-stone-50 border-stone-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-xs shadow-2xs ${
                            file.type === 'doc'
                              ? 'bg-blue-100 text-blue-700'
                              : file.type === 'pdf'
                              ? 'bg-red-100 text-red-700'
                              : file.type === 'presentation'
                              ? 'bg-orange-100 text-orange-700'
                              : file.type === 'archive'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {file.type.toUpperCase().slice(0, 3)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                              {file.name}
                            </span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.2 rounded-full border ${
                                isOfficial
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {isOfficial ? '官方系統預設' : '管理員存入檔案'}
                            </span>
                            <span className="text-[11px] text-stone-500 font-mono">
                              {formatFileSize(file.size)}
                            </span>
                          </div>

                          {file.description && (
                            <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                              {file.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-[10px] text-stone-400 mt-1 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{file.uploadedBy}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 右側操作按鈕 */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {/* 開關切換 */}
                        <button
                          type="button"
                          onClick={() => toggleManagedCheatSheetFileEnabled(file.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                            file.isEnabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-stone-200 text-stone-600 border-stone-300 hover:bg-stone-300'
                          }`}
                          title={file.isEnabled ? '點擊暫時自打包中排除' : '點擊重新納入打包'}
                        >
                          {file.isEnabled ? '已納入打包' : '已停用'}
                        </button>

                        {/* 單檔下載 */}
                        <button
                          type="button"
                          onClick={() => downloadSingleManagedFile(file)}
                          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="單獨下載此檔案檢驗"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">下載</span>
                        </button>

                        {/* 刪除按鈕 */}
                        {deleteConfirmId === file.id ? (
                          <div className="flex items-center gap-1 animate-in fade-in">
                            <button
                              type="button"
                              onClick={() => handleDeleteFile(file.id, file.name)}
                              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black cursor-pointer shadow-xs"
                            >
                              確定刪除
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 text-[11px] font-bold cursor-pointer"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(file.id)}
                            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-rose-200/80"
                            title="自懶人包中徹底刪除此檔案"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span className="hidden sm:inline">刪除</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 底部 Footer */}
        <div className="bg-stone-100 p-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-600 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>修改即時生效：前台所有「打包下載懶人包」均同步使用最新受管檔案庫</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={isTestingDownload || files.filter((f) => f.isEnabled).length === 0}
              onClick={handleTestDownloadPackage}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs border border-amber-600/30 disabled:opacity-50"
              title="立即測試下載生成的 ZIP 壓縮包，驗證檔案完整性"
            >
              <Download className="w-3.5 h-3.5 text-stone-950" />
              <span>{isTestingDownload ? '打包測試中...' : '測試立即打包下載 ZIP'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-all cursor-pointer"
            >
              完成並關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
