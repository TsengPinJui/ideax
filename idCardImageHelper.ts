/**
 * ID Card Image Processing Helper
 * Compresses and converts camera captures / uploaded ID card images into high-clarity Data URLs
 * for secure archiving and preview.
 */

import { uploadIdCardToStorage, uploadExpertCredentialToStorage } from '../services/idCardStorage';

export interface ProcessedIdCardImage {
  name: string;
  size: string;
  originalSize?: string;
  url: string;
  uploadedAt: string;
  storagePath?: string;
  isStorage?: boolean;
}

/**
 * 智慧安全壓縮（能辨識、不占空間）：
 * 避免過度壓縮導致身分證文字模糊，精確設定安全值：
 * - 解析度上限：1600px（確保身分證細微字體、防偽底紋、換發日期與身分證字號清晰可辨）
 * - 畫質壓縮率：0.84（84% 高保真 JPEG，有效降低 90%~95% 體積，檔案約 180KB~350KB 不占空間）
 * - 啟用雙線性高品質平滑縮放 (imageSmoothingQuality = 'high')
 */
export async function processIdCardImage(
  file: File,
  prefix = 'id_card',
  maxDimension = 1600,
  quality = 0.84
): Promise<ProcessedIdCardImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('請上傳或拍攝圖片格式檔案 (JPG, PNG, WebP)！');
  }

  const rawSizeKb = Math.round((file.size / 1024) * 10) / 10;
  const rawSizeStr = rawSizeKb > 1024 ? `${(rawSizeKb / 1024).toFixed(1)} MB` : `${rawSizeKb} KB`;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('讀取圖片檔案失敗，請重新拍攝或選擇相片。'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('圖片內容為空，請重新拍攝。'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('圖片解碼失敗，請確認檔案格式正確。'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // 若圖片尺寸超過 1920px 安全值，依比例縮放；小於 1920px 則維持原始解析度避免銳利度流失
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original src if canvas 2D context fails
          resolve({
            name: file.name || `${prefix}_photo.jpg`,
            size: rawSizeStr,
            originalSize: rawSizeStr,
            url: src,
            uploadedAt: new Date().toISOString(),
          });
          return;
        }

        // 高品質縮放設定，避免鋸齒
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 填滿乾淨白底避免透明 PNG 產生黑底
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // 安全值壓縮：預設 1600px 解析度 + 0.84 畫質（能清晰辨識字元，且檔案僅 200KB~350KB 不占空間）
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        let bytes = Math.round((compressedDataUrl.length * 3) / 4);

        // 若因照片複雜度高導致超過 450 KB，自動以 0.78 進行二次微調，嚴格限制容量
        if (bytes > 450 * 1024) {
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
          bytes = Math.round((compressedDataUrl.length * 3) / 4);
        }

        const sizeKb = Math.round((bytes / 1024) * 10) / 10;
        const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

        resolve({
          name: file.name || `${prefix}_${Date.now()}.jpg`,
          size: sizeStr,
          originalSize: rawSizeStr,
          url: compressedDataUrl,
          uploadedAt: new Date().toISOString(),
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses the image and immediately uploads to Firebase Cloud Storage.
 * Returns the storage URL, path, and metadata.
 */
export async function processAndUploadIdCardImage(
  file: File,
  side: 'front' | 'back',
  userId: string = 'solver_registration'
): Promise<ProcessedIdCardImage> {
  // 1. 高畫質壓縮
  const processed = await processIdCardImage(file, `id_card_${side}`);

  // 2. 上傳至 Firebase Cloud Storage
  const storageResult = await uploadIdCardToStorage(
    processed.url,
    userId,
    side,
    file.name || `${side}_id_card.jpg`
  );

  return {
    ...processed,
    url: storageResult.url,
    storagePath: storageResult.storagePath,
    isStorage: storageResult.isStorage,
    uploadedAt: storageResult.uploadedAt,
  };
}

/**
 * 專家專業證照專屬安全壓縮與雲端 Storage 上傳：
 * 與個人身分證件 (id_cards/) 嚴格分開，存於 (expert_credentials/)
 */
export async function processAndUploadExpertCredentialImage(
  file: File,
  userId: string = 'expert_applicant'
): Promise<ProcessedIdCardImage> {
  // 1. 安全值壓縮（1600px, 畫質 0.84，證書印章與字號清晰可辨，體積僅 200~350KB）
  const processed = await processIdCardImage(file, 'expert_credential', 1600, 0.84);

  // 2. 獨立儲存至 expert_credentials/ 目錄
  const storageResult = await uploadExpertCredentialToStorage(
    processed.url,
    userId,
    file.name || 'expert_cert.jpg'
  );

  return {
    ...processed,
    url: storageResult.url,
    storagePath: storageResult.storagePath,
    isStorage: storageResult.isStorage,
    uploadedAt: storageResult.uploadedAt,
  };
}
