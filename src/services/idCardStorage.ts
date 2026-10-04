import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export interface StorageUploadResult {
  url: string;
  storagePath: string;
  isStorage: boolean;
  uploadedAt: string;
  error?: string;
}

/**
 * Uploads an ID card photo (dataUrl base64) to Firebase Cloud Storage.
 * Securely archives the image under `id_cards/{userId}/{timestamp}_{side}.jpg`.
 * If Firebase Storage is temporarily blocked, CORS-restricted, or unavailable,
 * gracefully falls back to the high-clarity Data URL so user registration and verification
 * workflow never fails.
 */
export async function uploadIdCardToStorage(
  dataUrl: string,
  userId: string,
  side: 'front' | 'back',
  originalFileName?: string
): Promise<StorageUploadResult> {
  const timestamp = Date.now();
  const safeUserId = (userId || 'user_' + timestamp).replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `id_cards/${safeUserId}/${timestamp}_${side}.jpg`;
  const uploadedAt = new Date().toISOString();

  try {
    const storageRef = ref(storage, storagePath);
    await uploadString(storageRef, dataUrl, 'data_url', {
      contentType: 'image/jpeg',
      customMetadata: {
        side,
        userId: safeUserId,
        originalFileName: originalFileName || `id_card_${side}.jpg`,
        uploadedAt,
        systemPurpose: 'identity_verification_archive',
      },
    });

    const downloadUrl = await getDownloadURL(storageRef);
    return {
      url: downloadUrl,
      storagePath,
      isStorage: true,
      uploadedAt,
    };
  } catch (err: any) {
    console.warn(`[Firebase Storage] Uploading ID card (${side}) failed, fallback to local archive:`, err);
    return {
      url: dataUrl,
      storagePath: `local_archive/${safeUserId}/${side}.jpg`,
      isStorage: false,
      uploadedAt,
      error: err?.message || 'Storage upload error',
    };
  }
}

/**
 * Uploads an Expert Credential / License document (dataUrl base64) to Firebase Cloud Storage.
 * Securely archives under `expert_credentials/{userId}/{timestamp}_{sanitizedName}.jpg`.
 * Strictly segregated from personal ID cards (id_cards/) for compliance and role separation.
 */
export async function uploadExpertCredentialToStorage(
  dataUrl: string,
  userId: string,
  credentialName: string
): Promise<StorageUploadResult> {
  const timestamp = Date.now();
  const safeUserId = (userId || 'expert_' + timestamp).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = (credentialName || 'credential')
    .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5.-]/g, '_')
    .slice(0, 30);
  const storagePath = `expert_credentials/${safeUserId}/${timestamp}_${safeName}.jpg`;
  const uploadedAt = new Date().toISOString();

  try {
    const storageRef = ref(storage, storagePath);
    await uploadString(storageRef, dataUrl, 'data_url', {
      contentType: 'image/jpeg',
      customMetadata: {
        userId: safeUserId,
        credentialName,
        uploadedAt,
        systemPurpose: 'expert_credential_verification_archive',
      },
    });

    const downloadUrl = await getDownloadURL(storageRef);
    return {
      url: downloadUrl,
      storagePath,
      isStorage: true,
      uploadedAt,
    };
  } catch (err: any) {
    console.warn(`[Firebase Storage] Uploading expert credential failed, fallback to local archive:`, err);
    return {
      url: dataUrl,
      storagePath: `local_expert_archive/${safeUserId}/${safeName}.jpg`,
      isStorage: false,
      uploadedAt,
      error: err?.message || 'Storage upload error',
    };
  }
}
