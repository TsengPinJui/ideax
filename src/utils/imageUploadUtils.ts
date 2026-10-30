/**
 * 提案與作品圖片輕量化壓縮與上傳工具
 * 確保單張圖片與整包提案資料不超出 Firestore (1MB) 與 localStorage (5MB) 配額
 */

export const MAX_IMAGE_FILE_SIZE_MB = 2;
export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif';

export interface UploadedImageResult {
  ok: boolean;
  dataUrl?: string;
  error?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
}

export async function compressBase64Image(
  dataUrl: string,
  maxWidth = 1280,
  maxHeight = 1280,
  initialQuality = 0.8
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  // SVG 或極小圖不需重壓
  if (dataUrl.startsWith('data:image/svg') || dataUrl.length < 60_000) {
    return dataUrl;
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return dataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 600;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = initialQuality;
        let compressed = canvas.toDataURL('image/jpeg', quality);
        while (compressed.length > 260_000 && quality > 0.42) {
          quality -= 0.1;
          compressed = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function processUploadedImageFile(
  file: File,
  maxSizeMB: number = MAX_IMAGE_FILE_SIZE_MB
): Promise<UploadedImageResult> {
  if (!file) {
    return { ok: false, error: '未選擇檔案' };
  }
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: '請上傳圖片格式（JPG、PNG、WebP 或 GIF）' };
  }
  const maxBytes = Math.max(1, maxSizeMB) * 1024 * 1024 * 4; // 允許原始檔較大並透過自動壓縮處理
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `圖片檔案過大（${(file.size / (1024 * 1024)).toFixed(1)}MB），請選擇小於 ${maxSizeMB * 4}MB 的圖片`,
    };
  }

  try {
    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('讀取圖片失敗'));
      reader.readAsDataURL(file);
    });

    const optimizedDataUrl = await compressBase64Image(rawDataUrl, 1280, 1280, 0.82);
    const approxBytes = Math.round((optimizedDataUrl.length * 3) / 4);

    return {
      ok: true,
      dataUrl: optimizedDataUrl,
      sizeBytes: approxBytes,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || '圖片處理失敗，請換一張圖片再試',
    };
  }
}

export async function optimizeProposalImages(input: {
  coverImage?: string;
  galleryImages?: string[];
  cardDisplayImage?: string;
  selectedCardImage?: string;
}): Promise<{
  coverImage?: string;
  galleryImages?: string[];
  cardDisplayImage?: string;
  selectedCardImage?: string;
}> {
  const coverImage = input.coverImage
    ? await compressBase64Image(input.coverImage, 1280, 720, 0.8)
    : input.coverImage;

  const galleryImages = Array.isArray(input.galleryImages)
    ? await Promise.all(
        input.galleryImages.map((img) => compressBase64Image(img, 1200, 900, 0.78))
      )
    : input.galleryImages;

  const cardDisplayImage = input.cardDisplayImage
    ? await compressBase64Image(input.cardDisplayImage, 960, 640, 0.78)
    : input.cardDisplayImage;

  const selectedCardImage = input.selectedCardImage
    ? await compressBase64Image(input.selectedCardImage, 960, 640, 0.78)
    : input.selectedCardImage;

  return {
    coverImage,
    galleryImages,
    cardDisplayImage,
    selectedCardImage,
  };
}
