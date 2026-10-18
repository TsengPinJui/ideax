/**
 * 統一圖片上傳與檔案大小限制處理工具
 * - 預設單張圖片上限：2 MB (支援 JPG / PNG / WebP / GIF)
 * - 內建 Canvas 智慧輕量化壓縮（最寬 1440px），確保本地與雲端儲存流暢不破表
 */

export const MAX_IMAGE_FILE_SIZE_MB = 2;
export const MAX_IMAGE_FILE_SIZE_BYTES = MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024;

export const MAX_AVATAR_FILE_SIZE_MB = 6;
export const MAX_AVATAR_FILE_SIZE_BYTES = MAX_AVATAR_FILE_SIZE_MB * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function processUploadedImageFile(
  file: File,
  maxSizeMB: number = MAX_IMAGE_FILE_SIZE_MB
): Promise<{ ok: boolean; dataUrl?: string; error?: string; sizeText?: string }> {
  if (!file.type.startsWith('image/')) {
    return {
      ok: false,
      error: `檔案「${file.name}」不是有效的圖片格式（僅支援 JPG、PNG、WebP、GIF）`,
    };
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `圖片「${file.name}」檔案大小為 ${formatFileSize(file.size)}，超過單張上限 ${maxSizeMB}MB，請壓縮或選擇較小的圖片！`,
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

      // 若為 GIF 或小於 350KB，直接回傳原圖 DataURL
      if (file.type === 'image/gif' || file.size <= 350 * 1024) {
        resolve({
          ok: true,
          dataUrl: rawDataUrl,
          sizeText: formatFileSize(file.size),
        });
        return;
      }

      // 針對較大靜態圖片進行適度尺寸最佳化（最大寬高 1440px）
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1440;
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
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ ok: true, dataUrl: rawDataUrl, sizeText: formatFileSize(file.size) });
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(outputType, 0.86);
          resolve({
            ok: true,
            dataUrl: compressedDataUrl.length < rawDataUrl.length ? compressedDataUrl : rawDataUrl,
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
