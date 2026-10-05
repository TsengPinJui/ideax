import { getPlatformManualManifest } from './index';

export interface PlatformManualDoc {
  id: string;
  code?: string;
  name: string;
  title: string;
  description: string;
  itemCount?: number;
  fileType: 'system' | 'markdown' | 'text' | 'word' | 'pdf' | 'document';
  content?: string;
  dataUrl?: string;
  sizeFormatted?: string;
  uploadedAt?: string;
  isCustom?: boolean;
  data?: any;
}

const STORAGE_CUSTOM_FILES_KEY = 'ideax_manual_custom_files';
const STORAGE_DELETED_SYSTEM_KEY = 'ideax_manual_deleted_system_ids';

/**
 * 取得被刪除的預設系統檔案 ID 清單
 */
export const getDeletedSystemIds = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_SYSTEM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse deleted system file ids', e);
    return [];
  }
};

/**
 * 取得所有自訂上傳的檔案
 */
export const getCustomUploadedFiles = (): PlatformManualDoc[] => {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_FILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse custom manual files', e);
    return [];
  }
};

/**
 * 載入當前所有有效檔案（含系統檔案 + 自訂上傳檔案，排除已刪除者）
 */
export const loadAllManualDocuments = (): PlatformManualDoc[] => {
  const manifest = getPlatformManualManifest();
  const deletedIds = getDeletedSystemIds();

  // 1. 系統預設檔案
  const systemFiles: PlatformManualDoc[] = manifest.folders
    .filter((f) => !deletedIds.includes(f.id))
    .map((f) => ({
      id: f.id,
      code: f.code,
      name: f.name,
      title: f.title,
      description: f.description,
      itemCount: f.itemCount,
      fileType: 'system',
      data: f.data,
      isCustom: false,
    }));

  // 2. 自訂上傳檔案
  const customFiles = getCustomUploadedFiles();

  return [...systemFiles, ...customFiles];
};

/**
 * 儲存/新增一個自訂上傳檔案
 */
export const saveCustomManualFile = (newFile: PlatformManualDoc) => {
  const current = getCustomUploadedFiles();
  const filtered = current.filter((f) => f.id !== newFile.id);
  const updated = [newFile, ...filtered];
  localStorage.setItem(STORAGE_CUSTOM_FILES_KEY, JSON.stringify(updated));
  return updated;
};

/**
 * 刪除指定檔案（若為系統檔案則加入黑名單；若為自訂檔案則自本機儲存移除）
 */
export const deleteManualFileById = (id: string, isCustom: boolean) => {
  if (isCustom) {
    const current = getCustomUploadedFiles();
    const updated = current.filter((f) => f.id !== id);
    localStorage.setItem(STORAGE_CUSTOM_FILES_KEY, JSON.stringify(updated));
  } else {
    const deleted = getDeletedSystemIds();
    if (!deleted.includes(id)) {
      const updated = [...deleted, id];
      localStorage.setItem(STORAGE_DELETED_SYSTEM_KEY, JSON.stringify(updated));
    }
  }
};

/**
 * 恢復所有被刪除之系統預設檔案
 */
export const restoreAllSystemDefaultFiles = () => {
  localStorage.removeItem(STORAGE_DELETED_SYSTEM_KEY);
};
