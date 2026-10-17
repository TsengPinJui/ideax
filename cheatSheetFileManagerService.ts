import JSZip from 'jszip';
import {
  generateCompetitionDocContent,
  generateCompetitionPresentationPdfBlob,
} from './competitionCheatSheetService';

export interface CheatSheetManagedFile {
  id: string;
  name: string;
  size: number; // bytes
  type: string; // 'doc' | 'pdf' | 'docx' | 'image' | 'presentation' | 'archive' | 'text' | 'other'
  category: 'official_doc' | 'official_pdf' | 'custom_upload';
  uploadedAt: string;
  uploadedBy: string;
  contentDataUrl?: string; // Base64 data URL for custom files
  description?: string;
  isEnabled: boolean;
}

const STORAGE_KEY = 'ideax_cheat_sheet_managed_files_v1';
const DELETED_OFFICIAL_IDS_KEY = 'ideax_cheat_sheet_deleted_official_ids_v1';

export const DEFAULT_OFFICIAL_FILES: CheatSheetManagedFile[] = [
  {
    id: 'official_doc_guide',
    name: 'IdeaX_創星季_競賽辦法完整文字說明.doc',
    size: 28400,
    type: 'doc',
    category: 'official_doc',
    uploadedAt: '2026-10-13T00:00:00.000Z',
    uploadedBy: 'IdeaX 官方系統',
    description: '官方完整競賽辦法章程、4大時程、3大角色權益與評審維度文字說明',
    isEnabled: true,
  },
  {
    id: 'official_pdf_presentation',
    name: 'IdeaX_創星季_競賽圖文說明簡報.pdf',
    size: 512000,
    type: 'pdf',
    category: 'official_pdf',
    uploadedAt: '2026-10-13T00:00:00.000Z',
    uploadedBy: 'IdeaX 官方系統',
    description: '官方 5 大重點視覺化投影片簡報（賽事宗旨、時程、角色配額、大獎與FAQ）',
    isEnabled: true,
  },
];

/**
 * 取得被刪除的官方預設檔案 ID 清單
 */
export function getDeletedOfficialFileIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_OFFICIAL_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 儲存被刪除的官方預設檔案 ID 清單
 */
export function saveDeletedOfficialFileIds(ids: string[]): void {
  try {
    localStorage.setItem(DELETED_OFFICIAL_IDS_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error('Failed to save deleted official file IDs:', e);
  }
}

/**
 * 取得所有懶人包受管檔案（官方預設檔案 + 管理員自訂存入檔案）
 */
export function getManagedCheatSheetFiles(): CheatSheetManagedFile[] {
  try {
    const deletedOfficialIds = getDeletedOfficialFileIds();
    const rawCustom = localStorage.getItem(STORAGE_KEY);
    const customFiles: CheatSheetManagedFile[] = rawCustom ? JSON.parse(rawCustom) : [];

    const activeOfficialFiles = DEFAULT_OFFICIAL_FILES.filter(
      (f) => !deletedOfficialIds.includes(f.id)
    );

    return [...activeOfficialFiles, ...customFiles];
  } catch (err) {
    console.error('Failed to get managed cheat sheet files:', err);
    return [...DEFAULT_OFFICIAL_FILES];
  }
}

/**
 * 管理員存入新檔案至懶人包
 */
export function saveManagedCheatSheetFile(
  file: Omit<CheatSheetManagedFile, 'id' | 'uploadedAt'> & { id?: string }
): CheatSheetManagedFile {
  const customFiles = getCustomUploadedFiles();
  const fileId = file.id || `custom_file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const newFile: CheatSheetManagedFile = {
    ...file,
    id: fileId,
    uploadedAt: now,
  };

  const existingIdx = customFiles.findIndex((f) => f.id === fileId);
  if (existingIdx >= 0) {
    customFiles[existingIdx] = newFile;
  } else {
    customFiles.unshift(newFile);
  }

  saveCustomUploadedFiles(customFiles);
  notifyFilesChanged();
  return newFile;
}

/**
 * 管理員自懶人包刪除檔案
 */
export function deleteManagedCheatSheetFile(fileId: string): void {
  if (fileId.startsWith('official_')) {
    // 官方檔案標記為刪除
    const deletedIds = getDeletedOfficialFileIds();
    if (!deletedIds.includes(fileId)) {
      deletedIds.push(fileId);
      saveDeletedOfficialFileIds(deletedIds);
    }
  } else {
    // 自訂上傳檔案直接移除
    const customFiles = getCustomUploadedFiles();
    const updated = customFiles.filter((f) => f.id !== fileId);
    saveCustomUploadedFiles(updated);
  }
  notifyFilesChanged();
}

/**
 * 切換特定檔案是否納入打包下載 (Toggle isEnabled)
 */
export function toggleManagedCheatSheetFileEnabled(fileId: string): void {
  if (fileId.startsWith('official_')) {
    // 對官方檔案，切換等同於加入或移出刪除名單
    const deletedIds = getDeletedOfficialFileIds();
    if (deletedIds.includes(fileId)) {
      saveDeletedOfficialFileIds(deletedIds.filter((id) => id !== fileId));
    } else {
      deletedIds.push(fileId);
      saveDeletedOfficialFileIds(deletedIds);
    }
  } else {
    const customFiles = getCustomUploadedFiles();
    const target = customFiles.find((f) => f.id === fileId);
    if (target) {
      target.isEnabled = !target.isEnabled;
      saveCustomUploadedFiles(customFiles);
    }
  }
  notifyFilesChanged();
}

/**
 * 恢復官方預設檔案
 */
export function restoreDefaultCheatSheetFiles(): void {
  saveDeletedOfficialFileIds([]);
  notifyFilesChanged();
}

function getCustomUploadedFiles(): CheatSheetManagedFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomUploadedFiles(files: CheatSheetManagedFile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch (e) {
    console.error('Failed to save custom cheat sheet files:', e);
  }
}

function notifyFilesChanged(): void {
  try {
    window.dispatchEvent(new CustomEvent('ideax_cheat_sheet_files_changed'));
  } catch {}
}

/**
 * 單獨下載某個受管檔案
 */
export async function downloadSingleManagedFile(file: CheatSheetManagedFile): Promise<void> {
  if (file.category === 'official_doc') {
    const docHtml = generateCompetitionDocContent();
    const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword' });
    triggerBlobDownload(blob, file.name);
    return;
  }

  if (file.category === 'official_pdf') {
    const pdfBlob = await generateCompetitionPresentationPdfBlob();
    triggerBlobDownload(pdfBlob, file.name);
    return;
  }

  if (file.contentDataUrl) {
    const blob = dataUrlToBlob(file.contentDataUrl);
    triggerBlobDownload(blob, file.name);
    return;
  }
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'application/octet-stream';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

/**
 * 動態打包下載完整競賽懶人包 ZIP
 * 依據管理員目前於後台保留與存入的檔案清單進行打包！
 */
export async function downloadManagedCompetitionPackage(): Promise<void> {
  const zip = new JSZip();
  const files = getManagedCheatSheetFiles().filter((f) => f.isEnabled);

  let docAdded = false;
  let pdfAdded = false;

  for (const file of files) {
    if (file.category === 'official_doc') {
      const docHtml = generateCompetitionDocContent();
      zip.file(file.name, '\ufeff' + docHtml);
      docAdded = true;
    } else if (file.category === 'official_pdf') {
      try {
        const pdfBlob = await generateCompetitionPresentationPdfBlob();
        zip.file(file.name, pdfBlob);
        pdfAdded = true;
      } catch (err) {
        console.error('Failed to generate PDF for package:', err);
      }
    } else if (file.category === 'custom_upload' && file.contentDataUrl) {
      const parts = file.contentDataUrl.split(';base64,');
      if (parts.length === 2) {
        zip.file(file.name, parts[1], { base64: true });
      }
    }
  }

  // 兜底保障：若管理員未保留任何檔案，至少產生一份官方文字說明
  if (!docAdded && !pdfAdded && files.length === 0) {
    const docHtml = generateCompetitionDocContent();
    zip.file('IdeaX_創星季_競賽辦法完整文字說明.doc', '\ufeff' + docHtml);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(content, 'IdeaX_創星季_競賽懶人包打包資料夾.zip');
}
