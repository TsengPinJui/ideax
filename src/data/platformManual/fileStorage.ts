import { getPlatformManualManifest } from './index';
import {
  syncCustomManualFileToFirestore,
  deleteCustomManualFileFromFirestore,
  getCustomManualFilesFromFirestore,
  syncDeletedSystemManualIdsToFirestore,
  getDeletedSystemManualIdsFromFirestore,
} from '../../services/firestoreSync';

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
 * 取得所有自訂上傳的檔案 (自快取)
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
 * 自 Firestore 雲端資料庫初始化與同步最新檔案與設定
 */
export const initManualFilesFromFirestore = async (): Promise<PlatformManualDoc[]> => {
  try {
    const [cloudFiles, cloudDeletedIds] = await Promise.all([
      getCustomManualFilesFromFirestore(),
      getDeletedSystemManualIdsFromFirestore(),
    ]);

    if (cloudFiles && Array.isArray(cloudFiles)) {
      // 合併本地與雲端檔案，以雲端為主但保留最新
      const localFiles = getCustomUploadedFiles();
      const map = new Map<string, PlatformManualDoc>();
      localFiles.forEach((f) => map.set(f.id, f));
      cloudFiles.forEach((f) => map.set(f.id, f));
      const merged = Array.from(map.values());
      try {
        localStorage.setItem(STORAGE_CUSTOM_FILES_KEY, JSON.stringify(merged));
      } catch (err) {
        console.warn('localStorage full, skipping cache save', err);
      }
    }

    if (cloudDeletedIds && Array.isArray(cloudDeletedIds)) {
      try {
        localStorage.setItem(STORAGE_DELETED_SYSTEM_KEY, JSON.stringify(cloudDeletedIds));
      } catch (err) {
        console.warn('localStorage full', err);
      }
    }
  } catch (e) {
    console.warn('Failed to sync manual files from Firestore, fallback to local', e);
  }

  return loadAllManualDocuments();
};

/**
 * 儲存/新增一個自訂上傳檔案（雙向同步寫入本地快取與雲端 Firestore 資料庫）
 */
export const saveCustomManualFile = (newFile: PlatformManualDoc) => {
  const current = getCustomUploadedFiles();
  const filtered = current.filter((f) => f.id !== newFile.id);
  const updated = [newFile, ...filtered];
  try {
    localStorage.setItem(STORAGE_CUSTOM_FILES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save to localStorage (quota exceeded?), will still sync to cloud Firestore', err);
  }

  // 自動非同步持久化存入雲端 Firestore 資料庫
  syncCustomManualFileToFirestore(newFile).catch((err) => {
    console.warn('Background sync to Firestore failed:', err);
  });

  return updated;
};

/**
 * 刪除指定檔案（若為系統檔案則加入黑名單；若為自訂檔案則自本機快取與雲端 Firestore 移除）
 */
export const deleteManualFileById = (id: string, isCustom: boolean) => {
  if (isCustom) {
    const current = getCustomUploadedFiles();
    const updated = current.filter((f) => f.id !== id);
    try {
      localStorage.setItem(STORAGE_CUSTOM_FILES_KEY, JSON.stringify(updated));
    } catch {}
    deleteCustomManualFileFromFirestore(id).catch((err) => {
      console.warn('Failed to delete from Firestore:', err);
    });
  } else {
    const deleted = getDeletedSystemIds();
    if (!deleted.includes(id)) {
      const updated = [...deleted, id];
      try {
        localStorage.setItem(STORAGE_DELETED_SYSTEM_KEY, JSON.stringify(updated));
      } catch {}
      syncDeletedSystemManualIdsToFirestore(updated).catch((err) => {
        console.warn('Failed to sync deleted ids to Firestore:', err);
      });
    }
  }
};

/**
 * 恢復所有被刪除之系統預設檔案
 */
export const restoreAllSystemDefaultFiles = () => {
  try {
    localStorage.removeItem(STORAGE_DELETED_SYSTEM_KEY);
  } catch {}
  syncDeletedSystemManualIdsToFirestore([]).catch((err) => {
    console.warn('Failed to restore default system files in Firestore:', err);
  });
};

