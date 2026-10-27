import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const CACHE_NAME = 'ideax-island-media-v1';
const CACHE_KEY = '/__firestore_media__/island_intro_video_v1.mp4';
const MEDIA_COLLECTION = 'platform_media_chunks';
const MEDIA_DOC_PREFIX = 'island_intro_video_';
const DEFAULT_TOTAL_CHUNKS = 14;

let memoryObjectUrl: string | null = null;
let inflightPromise: Promise<string> | null = null;
const progressListeners = new Set<(percent: number) => void>();
let lastProgressPercent = 0;

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

  return new Blob(chunks, { type: mimeType });
}

/**
 * 從 Firestore 雲端資料庫 (`platform_media_chunks`) 載入創點島導覽影片並轉為可播放的 Object URL，
 * 同時快取於瀏覽器 CacheStorage 與記憶體中，避免本地專案包含大型影片檔案。
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
        // 1. 優先檢查瀏覽器 CacheStorage
        const cachedBlob = await readFromBrowserCache();
        if (cachedBlob) {
          memoryObjectUrl = URL.createObjectURL(cachedBlob);
          notifyProgress(100);
          return memoryObjectUrl;
        }

        // 2. 從 Firestore 分片集合載入並組裝 Blob
        try {
          const firestoreBlob = await fetchVideoBlobFromFirestore();
          await writeToBrowserCache(firestoreBlob);
          memoryObjectUrl = URL.createObjectURL(firestoreBlob);
          notifyProgress(100);
          return memoryObjectUrl;
        } catch (err) {
          console.warn('[IslandIntroVideo] Direct Firestore load failed, falling back to API stream:', err);
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
