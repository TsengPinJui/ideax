import { getAuthHeaders } from './authHeader';
/**
 * 創星季專家審核結果自動發送信件通知服務
 */

export interface ExpertNotificationParams {
  expertEmail: string;
  expertName: string;
  status: 'approved' | 'rejected';
  reviewNote?: string;
  isJudgeSelected?: boolean;
}

export async function notifyExpertReviewEmail(
  params: ExpertNotificationParams
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/competition/admin/notify-expert-review', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      return { success: false, message: data.error || '通知信寄送失敗，請稍後再試' };
    }
    return {
      success: true,
      message: data.message || `已寄送通知信至 ${params.expertEmail}`,
    };
  } catch (err: any) {
    console.warn('[Expert Notification Service Warning]:', err);
    return {
      success: false,
      message: '無法連線寄送通知信，請稍後再試',
    };
  }
}
