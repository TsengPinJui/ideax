import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const CACHE_NAME = 'ideax-island-media-v1';
const CACHE_KEY = '/__firestore_media__/island_intro_video_v1.mp4';
const OPFS_FILE_NAME = 'island_intro_video_v1.mp4';
const IDB_NAME = 'ideax_device_media_db';
const IDB_STORE = 'media_blobs';
const IDB_KEY = 'island_intro_video_v1';
const DEVICE_SAVED_FLAG_KEY = 'ideax_island_video_saved_on_device_v1';

const MEDIA_COLLECTION = 'platform_media_chunks';
const MEDIA_DOC_PREFIX = 'island_intro_video_';
const DEFAULT_TOTAL_CHUNKS = 14;

let memoryObjectUrl: string | null = null;
let inflightPromise: Promise<string> | null = null;
const progressListeners = new Set<(percent: number) => void>();
let lastProgressPercent = 0;

/**
 * 判斷當前是否以已安裝的 App（PWA Standalone / 手機桌面 App / 已下載 App）模式執行
 */
export function isRunningAsInstalledApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isStandaloneMedia =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: fullscreen)').matches ||
      window.matchMedia?.('(display-mode: minimal-ui)').matches;
    const isIosStandalone = Boolean((window.navigator as any)?.standalone);
    const isAndroidTwa = document.referrer.includes('android-app://');
    const hasDownloadedFlag = localStorage.getItem('ideax_pwa_downloaded') === 'true';
    return Boolean(isStandaloneMedia || isIosStandalone || isAndroidTwa || hasDownloadedFlag);
  } catch {
    return false;
  }
}

/**
 * 若記憶體中已經備妥影片 Object URL，可同步立即取得（0 毫秒免等待）
 */
export function getCachedIslandIntroVideoUrlSync(): string | null {
  return memoryObjectUrl;
}

/**
 * 要求作業系統將本 App 的裝置儲存空間設為永久保存（Persistent Storage），避免系統自動清理快取
 */
async function requestPersistentDeviceStorage(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) return;
  try {
    const persisted = await navigator.storage.persisted();
    if (!persisted) {
      await navigator.storage.persist();
    }
  } catch {
    // ignore permission errors
  }
}

function notifyProgress(percent: number) {
  lastProgressPercent = Math.max(lastProgressPercent, Math.min(100, Math.round(percent)));
  progressListeners.forEach((cb) => {
    try {
      cb(lastProgressPercent);
    } catch {
      // ignore listener errors
    }
  });
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// =========================================================
// 1. 裝置原生檔案系統 (OPFS - Origin Private File System)
// =========================================================
async function readFromDeviceOpfs(): Promise<Blob | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(OPFS_FILE_NAME, { create: false });
    const file = await fileHandle.getFile();
    if (file && file.size > 100000) {
      return file;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeToDeviceOpfs(blob: Blob): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return;
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(OPFS_FILE_NAME, { create: true });
    if ('createWritable' in fileHandle) {
      const writable = await (fileHandle as any).createWritable();
      await writable.write(blob);
      await writable.close();
    }
  } catch {
    // ignore OPFS write unsupported on older browsers
  }
}

// =========================================================
// 2. 裝置本地資料庫 (IndexedDB)
// =========================================================
function openDeviceMediaIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const dbInstance = req.result;
      if (!dbInstance.objectStoreNames.contains(IDB_STORE)) {
        dbInstance.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
}

async function readFromDeviceIndexedDb(): Promise<Blob | null> {
  try {
    const idb = await openDeviceMediaIdb();
    return await new Promise<Blob | null>((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => {
        const result = req.result;
        if (result instanceof Blob && result.size > 100000) {
          resolve(result);
        } else if (result && result.buffer instanceof ArrayBuffer && result.buffer.byteLength > 100000) {
          resolve(new Blob([result.buffer], { type: result.mimeType || 'video/mp4' }));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
      tx.oncomplete = () => idb.close();
    });
  } catch {
    return null;
  }
}

async function writeToDeviceIndexedDb(blob: Blob): Promise<void> {
  try {
    const buffer = await blob.arrayBuffer();
    const idb = await openDeviceMediaIdb();
    await new Promise<void>((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({ buffer, mimeType: blob.type || 'video/mp4', updatedAt: Date.now() }, IDB_KEY);
      tx.oncomplete = () => {
        idb.close();
        resolve();
      };
      tx.onerror = () => {
        idb.close();
        resolve();
      };
    });
  } catch {
    // ignore IDB quota errors
  }
}

// =========================================================
// 3. 瀏覽器 CacheStorage
// =========================================================
async function readFromBrowserCache(): Promise<Blob | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await window.caches.open(CACHE_NAME);
    const matched = await cache.match(CACHE_KEY);
    if (!matched) return null;
    const blob = await matched.blob();
    if (blob && blob.size > 100000) {
      return blob;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeToBrowserCache(blob: Blob): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await window.caches.open(CACHE_NAME);
    const response = new Response(blob, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(blob.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
    await cache.put(CACHE_KEY, response);
  } catch {
    // ignore cache quota errors
  }
}

/**
 * 從裝置本地儲存（OPFS -> IndexedDB -> CacheStorage）讀取已下載的影片
 */
async function readFromDeviceStorage(): Promise<Blob | null> {
  const opfsBlob = await readFromDeviceOpfs();
  if (opfsBlob) return opfsBlob;

  const idbBlob = await readFromDeviceIndexedDb();
  if (idbBlob) {
    // 同步補寫回 OPFS 與 CacheStorage
    writeToDeviceOpfs(idbBlob).catch(() => {});
    writeToBrowserCache(idbBlob).catch(() => {});
    return idbBlob;
  }

  const cacheBlob = await readFromBrowserCache();
  if (cacheBlob) {
    // 同步補寫回 OPFS 與 IndexedDB 確保永久留存於裝置
    writeToDeviceOpfs(cacheBlob).catch(() => {});
    writeToDeviceIndexedDb(cacheBlob).catch(() => {});
    return cacheBlob;
  }

  return null;
}

/**
 * 將下載完成的影片永久寫入用戶裝置（OPFS + IndexedDB + CacheStorage）
 */
async function saveToDeviceStorage(blob: Blob): Promise<void> {
  await requestPersistentDeviceStorage();
  await Promise.allSettled([
    writeToDeviceOpfs(blob),
    writeToDeviceIndexedDb(blob),
    writeToBrowserCache(blob),
  ]);
  try {
    localStorage.setItem(DEVICE_SAVED_FLAG_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

async function fetchVideoBlobFromFirestore(): Promise<Blob> {
  notifyProgress(5);
  const firstDocId = `${MEDIA_DOC_PREFIX}00`;
  const firstSnap = await getDoc(doc(db, MEDIA_COLLECTION, firstDocId));
  if (!firstSnap.exists()) {
    throw new Error('Firestore media chunk 00 not found');
  }

  const firstData = firstSnap.data() as {
    totalChunks?: number;
    mimeType?: string;
    data?: string;
  };
  const totalChunks = Number(firstData?.totalChunks) || DEFAULT_TOTAL_CHUNKS;
  const mimeType = firstData?.mimeType || 'video/mp4';

  const chunks: Uint8Array[] = new Array(totalChunks);
  chunks[0] = base64ToUint8Array(String(firstData?.data || ''));

  let completed = 1;
  notifyProgress((completed / totalChunks) * 100);

  const remainingIndices: number[] = [];
  for (let i = 1; i < totalChunks; i++) {
    remainingIndices.push(i);
  }

  const CONCURRENCY = 4;
  let cursor = 0;

  async function worker() {
    while (cursor < remainingIndices.length) {
      const idx = remainingIndices[cursor++];
      const docId = `${MEDIA_DOC_PREFIX}${String(idx).padStart(2, '0')}`;
      const snap = await getDoc(doc(db, MEDIA_COLLECTION, docId));
      if (!snap.exists()) {
        throw new Error(`Missing video chunk ${docId}`);
      }
      const d = snap.data() as { data?: string };
      chunks[idx] = base64ToUint8Array(String(d?.data || ''));
      completed += 1;
      notifyProgress((completed / totalChunks) * 100);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, remainingIndices.length) }, () => worker())
  );

  return new Blob(chunks as any, { type: mimeType });
}

/**
 * 載入創點島導覽影片並永久儲存至用戶裝置（OPFS + IndexedDB + CacheStorage）。
 * 只要下載過一次，之後開啟 App 或網頁皆直接從裝置本機秒開播放，不需再次下載。
 */
export async function loadIslandIntroVideoUrl(
  onProgress?: (percent: number) => void
): Promise<string> {
  if (onProgress) {
    progressListeners.add(onProgress);
    onProgress(memoryObjectUrl ? 100 : lastProgressPercent);
  }

  try {
    if (memoryObjectUrl) {
      notifyProgress(100);
      return memoryObjectUrl;
    }

    if (!inflightPromise) {
      inflightPromise = (async () => {
        // 1. 優先從裝置本機儲存（OPFS / IndexedDB / CacheStorage）讀取，免重新載入
        const deviceBlob = await readFromDeviceStorage();
        if (deviceBlob) {
          memoryObjectUrl = URL.createObjectURL(deviceBlob);
          notifyProgress(100);
          return memoryObjectUrl;
        }

        // 2. 裝置尚無檔案時，從雲端下載一次並永久儲存至裝置本機
        try {
          const firestoreBlob = await fetchVideoBlobFromFirestore();
          await saveToDeviceStorage(firestoreBlob);
          memoryObjectUrl = URL.createObjectURL(firestoreBlob);
          notifyProgress(100);
          return memoryObjectUrl;
        } catch (err) {
          console.warn('[IslandIntroVideo] Direct Firestore load failed, falling back to API stream:', err);
          try {
            const res = await fetch('/api/media/island-intro-video');
            if (res.ok) {
              const apiBlob = await res.blob();
              if (apiBlob.size > 100000) {
                await saveToDeviceStorage(apiBlob);
                memoryObjectUrl = URL.createObjectURL(apiBlob);
                notifyProgress(100);
                return memoryObjectUrl;
              }
            }
          } catch {
            // ignore API fallback fetch error
          }
          notifyProgress(100);
          return '/api/media/island-intro-video';
        }
      })().finally(() => {
        inflightPromise = null;
      });
    }

    return await inflightPromise;
  } finally {
    if (onProgress) {
      progressListeners.delete(onProgress);
    }
  }
}

/**
 * 供 App 用戶或背景閒置時預先將影片下載並儲存至裝置，進入創點島時 0 等待直接播放
 */
export function preloadIslandIntroVideoToDevice(): Promise<string> {
  return loadIslandIntroVideoUrl().catch(() => '');
}

