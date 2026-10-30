/**
 * 實名認證身分證件與專家憑證圖片清晰壓縮與上傳輔助工具
 */

export interface ProcessedIdCardImage {
  name: string;
  size: string;
  url: string;
  dataUrl?: string;
  storagePath?: string;
  isStorage?: boolean;
  uploadedAt: string;
  width?: number;
  height?: number;
}

function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('無法解析圖片檔案，請確認格式為 JPG、PNG 或 WebP'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('讀取圖片檔案失敗'));
    reader.readAsDataURL(file);
  });
}

export async function processIdCardImage(
  file: File,
  _side?: 'front' | 'back'
): Promise<ProcessedIdCardImage> {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('請選擇有效的圖片檔案（JPG / PNG / WebP）');
  }

  const img = await loadImageElement(file);
  const maxDimension = 1280;
  let width = img.naturalWidth || img.width || 800;
  let height = img.naturalHeight || img.height || 600;

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
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('瀏覽器畫布初始化失敗');
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.82;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > 380_000 && quality > 0.45) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  const approxBytes = Math.round((dataUrl.length * 3) / 4);
  const uploadedAt = new Date().toISOString();

  return {
    name: file.name || 'id_card.jpg',
    size: formatByteSize(approxBytes),
    url: dataUrl,
    dataUrl,
    isStorage: false,
    uploadedAt,
    width,
    height,
  };
}

export async function processAndUploadIdCardImage(
  file: File,
  side: 'front' | 'back',
  userId?: string
): Promise<ProcessedIdCardImage> {
  const processed = await processIdCardImage(file, side);
  const safeUid = (userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `id_cards/${safeUid}/${side}_${Date.now()}.jpg`;
  return {
    ...processed,
    storagePath,
  };
}

export async function processAndUploadExpertCredentialImage(
  file: File,
  userId?: string
): Promise<ProcessedIdCardImage> {
  const processed = await processIdCardImage(file);
  const safeUid = (userId || 'expert').replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `expert_credentials/${safeUid}/cred_${Date.now()}.jpg`;
  return {
    ...processed,
    storagePath,
  };
}
