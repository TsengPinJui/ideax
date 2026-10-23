/**
 * 統一圖片上傳與檔案大小限制處理工具
 * - 提案圖片與封面單張上限：6 MB (支援 JPG / PNG / WebP / GIF / BMP / JFIF / AVIF)
 * - 內建 Canvas 智慧輕量化壓縮（最適寬高 1600px），確保本地與雲端儲存流暢且不超出 Firestore 1MB 上限
 */

export const MAX_IMAGE_FILE_SIZE_MB = 6;
export const MAX_IMAGE_FILE_SIZE_BYTES = MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024;

export const MAX_AVATAR_FILE_SIZE_MB = 6;
export const MAX_AVATAR_FILE_SIZE_BYTES = MAX_AVATAR_FILE_SIZE_MB * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES =
  'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/*,.jpg,.jpeg,.png,.webp,.gif,.jfif,.bmp,.avif';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function processUploadedImageFile(
  file: File,
  maxSizeMB: number = MAX_IMAGE_FILE_SIZE_MB
): Promise<{ ok: boolean; dataUrl?: string; error?: string; sizeText?: string }> {
  // 兼顧 MIME 與副檔名判斷，避免某些作業系統或瀏覽器 MIME 為空導致上傳受阻
  const isImageMime = Boolean(file.type && file.type.startsWith('image/'));
  const isImageExt = /\.(jpe?g|png|webp|gif|jfif|bmp|svg|avif)$/i.test(file.name);
  if (!isImageMime && !isImageExt) {
    return {
      ok: false,
      error: `檔案「${file.name}」不是有效的圖片格式（支援 JPG、PNG、WebP、GIF、BMP）`,
    };
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `圖片「${file.name}」檔案大小為 ${formatFileSize(file.size)}，超過單張上限 ${maxSizeMB}MB，請選擇 ${maxSizeMB}MB 以內的圖片！`,
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => {
      resolve({
        ok: false,
        error: `讀取圖片「${file.name}」失敗，請重新選擇檔案`,
      });
    };
    reader.onload = (ev) => {
      const rawDataUrl = ev.target?.result as string;
      if (!rawDataUrl) {
        resolve({ ok: false, error: '圖片讀取結果為空' });
        return;
      }

      // 檢查是否為 GIF 動態圖且體積適中（小於 800KB 直接保留）
      const isGif = file.type === 'image/gif' || /\.gif$/i.test(file.name);
      if (isGif && file.size <= 800 * 1024) {
        resolve({
          ok: true,
          dataUrl: rawDataUrl,
          sizeText: formatFileSize(file.size),
        });
        return;
      }

      // 針對所有靜態大圖（最大可達 6MB）進行高效 Canvas 縮放與最佳化（最寬高 1600px）
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1600;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(32, width);
          canvas.height = Math.max(32, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ ok: true, dataUrl: rawDataUrl, sizeText: formatFileSize(file.size) });
            return;
          }

          // 保持白底背景，避免 PNG 轉 JPEG 時產生黑底
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          ctx.restore();

          // 輸出高品質 JPEG 格式（品質 0.86），體積約 120KB~260KB，畫質極細緻且符合 Firestore 1MB 文件上限
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.86);
          resolve({
            ok: true,
            dataUrl: compressedDataUrl,
            sizeText: formatFileSize(file.size),
          });
        } catch {
          resolve({ ok: true, dataUrl: rawDataUrl, sizeText: formatFileSize(file.size) });
        }
      };
      img.onerror = () => {
        resolve({ ok: true, dataUrl: rawDataUrl, sizeText: formatFileSize(file.size) });
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 將 Base64 Data URL 圖片壓制至適當規格（預設最長邊 1100px，品質 0.82）
 * 確保不爆掉 localStorage 5MB 配額與 Firestore 1MB 單份文件上限
 */
export async function compressBase64Image(
  dataUrl: string,
  maxDimension: number = 1100,
  quality: number = 0.82
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  if (!dataUrl.startsWith('data:image/')) return dataUrl;
  // 若體積已經小於 90KB，不需二次壓縮
  if (dataUrl.length < 90 * 1024) return dataUrl;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(32, width);
          canvas.height = Math.max(32, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          ctx.restore();
          const out = canvas.toDataURL('image/jpeg', quality);
          resolve(out.length < dataUrl.length ? out : dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

/**
 * 批次最佳化提案或草稿所包含的所有圖片（封面、圖集、卡片展示圖）
 */
export async function optimizeProposalImages<T extends {
  coverImage?: string;
  galleryImages?: string[];
  cardDisplayImage?: string;
  selectedCardImage?: string;
}>(data: T): Promise<T> {
  const result = { ...data };
  if (result.coverImage && result.coverImage.startsWith('data:image/')) {
    result.coverImage = await compressBase64Image(result.coverImage, 1100, 0.82);
  }
  if (Array.isArray(result.galleryImages) && result.galleryImages.length > 0) {
    result.galleryImages = await Promise.all(
      result.galleryImages.map((img) => (img?.startsWith('data:image/') ? compressBase64Image(img, 1000, 0.80) : Promise.resolve(img)))
    );
  }
  if (result.cardDisplayImage && result.cardDisplayImage.startsWith('data:image/')) {
    result.cardDisplayImage = await compressBase64Image(result.cardDisplayImage, 1000, 0.80);
  }
  if (result.selectedCardImage && result.selectedCardImage.startsWith('data:image/')) {
    result.selectedCardImage = await compressBase64Image(result.selectedCardImage, 1000, 0.80);
  }
  return result;
}

