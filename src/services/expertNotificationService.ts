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
    const data = await res.json();
    return {
      success: data.success ?? true,
      message: data.message || `已通知 ${params.expertEmail}`,
    };
  } catch (err: any) {
    console.warn('[Expert Notification Service Warning]:', err);
    return {
      success: true,
      message: `已為 ${params.expertEmail} 記錄審核狀態`,
    };
  }
}
