/**
 * 創星季提案圖片：由伺服器以服務帳戶上傳到 Firebase Storage，提案內只保存圖片連結。
 *
 * 用戶端直接上傳會受 Storage 規則限制（曾出現 storage/unauthorized），
 * 改由伺服器處理，避免規則差異導致用戶送不出提案；也讓提案資料不超過 Firestore 單筆 1MB 上限。
 */
import { randomUUID } from 'crypto';
import { getApps } from 'firebase-admin/app';

const BUCKET = 'ideax-2af9c.firebasestorage.app';
const INLINE_IMAGE_RE = /data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+/g;
const MAX_IMAGES = 30;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** 把物件中所有內嵌的 base64 圖片上傳到 Storage 並換成下載連結；沒有服務帳戶時原樣回傳 */
export async function uploadInlineProposalImages<T>(data: T, uid: string, enabled: boolean): Promise<T> {
  if (!enabled || !getApps().length) return data;
  const json = JSON.stringify(data);
  const found = Array.from(new Set(json.match(INLINE_IMAGE_RE) || []));
  if (found.length === 0) return data;
  if (found.length > MAX_IMAGES) throw new Error(`圖片數量過多（${found.length} 張），請減少後再送出`);

  const { getStorage } = await import('firebase-admin/storage');
  const bucket = getStorage(getApps()[0]).bucket(BUCKET);
  const safeUid = String(uid).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const urlByData = new Map<string, string>();
  let i = 0;
  for (const dataUrl of found) {
    const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
    const ext = mime === 'image/jpeg' || mime === 'image/jpg' ? 'jpg' : mime.split('/')[1];
    const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
    if (buf.length > MAX_IMAGE_BYTES) throw new Error('單張圖片超過 8MB，請換一張較小的圖片');
    const path = `competition_proposal_images/${safeUid}/${Date.now()}_${i++}.${ext}`;
    const token = randomUUID();
    await bucket.file(path).save(buf, {
      resumable: false,
      contentType: mime,
      metadata: { metadata: { firebaseStorageDownloadTokens: token, uploadedBy: safeUid } },
    });
    urlByData.set(
      dataUrl,
      `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`,
    );
  }
  return JSON.parse(json.replace(INLINE_IMAGE_RE, (m) => urlByData.get(m) || m));
}
