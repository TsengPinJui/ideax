/**
 * IdeaX 創點子：交易型電子郵件（透過 Resend 寄送）
 *
 * 需要的環境變數：
 * - RESEND_API_KEY：Resend 的寄信金鑰（Sending access）
 * - MAIL_FROM（選填）：寄件人，預設「IdeaX 創點子團隊 <noreply@ideax.tw>」
 * - MAIL_REPLY_TO（選填）：用戶按「回覆」時寄到的信箱
 * - APP_URL（選填）：信件中的網站連結，預設 https://ideax.tw
 */

const DEFAULT_FROM = 'IdeaX 創點子團隊 <noreply@ideax.tw>';

export function isMailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_'));
}

export function getSiteUrl(): string {
  const raw = (process.env.APP_URL || '').trim();
  if (/^https?:\/\//.test(raw) && !raw.includes('MY_APP_URL')) return raw.replace(/\/+$/, '');
  return 'https://ideax.tw';
}

/** 放進信件 HTML 前一律跳脫，避免使用者輸入的名稱或備註變成 HTML */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Resend 分類標籤，方便在後台篩選 */
  tag?: string;
  replyTo?: string;
}

export async function sendMail(input: SendMailInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!isMailerConfigured()) {
    return { ok: false, error: 'mailer_not_configured' };
  }
  const replyTo = input.replyTo || process.env.MAIL_REPLY_TO || undefined;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || DEFAULT_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(input.tag ? { tags: [{ name: 'category', value: input.tag }] } : {}),
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      // 不記錄收件者，只記錄錯誤類型
      console.warn(`[Mailer] Resend 寄送失敗 (${res.status}):`, data?.name || data?.message || 'unknown');
      return { ok: false, error: data?.message || `HTTP ${res.status}` };
    }
    return { ok: true, id: data?.id };
  } catch (err: any) {
    console.warn('[Mailer] Resend 連線失敗:', err?.message || err);
    return { ok: false, error: err?.message || 'network_error' };
  }
}

/* ------------------------------------------------------------------ */
/* 信件版型                                                             */
/* ------------------------------------------------------------------ */

interface LayoutOptions {
  preheader: string;
  heading: string;
  /** 已經跳脫好的 HTML 內容 */
  bodyHtml: string;
  button?: { label: string; url: string };
  footerNote?: string;
}

export function renderLayout({ preheader, heading, bodyHtml, button, footerNote }: LayoutOptions): string {
  const site = getSiteUrl();
  const buttonHtml = button
    ? `<tr><td style="padding:8px 0 4px 0;">
         <a href="${escapeHtml(button.url)}" style="display:inline-block;background:#F59E0B;color:#17140F;font-weight:800;font-size:15px;text-decoration:none;padding:13px 26px;border-radius:12px;">${escapeHtml(button.label)}</a>
       </td></tr>`
    : '';
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#FBF7EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang TC','Noto Sans TC','Microsoft JhengHei',sans-serif;color:#17140F;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7EE;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding:0 4px 14px 4px;">
          <a href="${site}" style="text-decoration:none;color:#17140F;font-weight:900;font-size:18px;letter-spacing:-0.01em;">
            <span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:8px;background:#F59E0B;color:#17140F;font-size:15px;margin-right:6px;">💡</span>IdeaX 創點子
          </a>
        </td></tr>
        <tr><td style="background:#FFFFFF;border:1px solid #EFE4C4;border-radius:20px;padding:28px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="font-size:21px;font-weight:900;line-height:1.35;padding-bottom:14px;">${escapeHtml(heading)}</td></tr>
            <tr><td style="font-size:15px;line-height:1.75;color:#3F3A30;">${bodyHtml}</td></tr>
            ${buttonHtml}
          </table>
        </td></tr>
        <tr><td style="padding:16px 6px 0 6px;font-size:12px;line-height:1.7;color:#8A7F68;">
          ${footerNote ? `${escapeHtml(footerNote)}<br>` : ''}
          IdeaX 創點子團隊｜<a href="${site}" style="color:#8A7F68;">${site.replace(/^https?:\/\//, '')}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function codeBlock(code: string): string {
  return `<div style="margin:18px 0 6px 0;padding:16px;border-radius:14px;background:#FFF6D8;border:1px solid #FFE08A;text-align:center;">
    <span style="font-size:32px;font-weight:900;letter-spacing:0.32em;color:#17140F;font-family:'SF Mono',Menlo,Consolas,monospace;">${escapeHtml(code)}</span>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* 各種信件                                                             */
/* ------------------------------------------------------------------ */

export function verificationCodeEmail(params: {
  code: string;
  purpose: 'forgot_password' | 'verify_email' | 'general';
  name?: string;
  minutes: number;
}) {
  const purposeText =
    params.purpose === 'forgot_password' ? '重設密碼' : params.purpose === 'verify_email' ? ' Email ' : '';
  const hello = params.name ? `${escapeHtml(params.name)} 您好，` : '您好，';
  const subject = `${params.code} 是您的 IdeaX 創點子驗證碼`;
  const html = renderLayout({
    preheader: `驗證碼 ${params.code}，${params.minutes} 分鐘內有效`,
    heading: `您的${purposeText}驗證碼`.replace(/\s+驗證碼/, ' 驗證碼'),
    bodyHtml: `${hello}請在頁面上輸入以下 6 位數驗證碼：${codeBlock(params.code)}
      <p style="margin:10px 0 0 0;font-size:13px;color:#6B6250;">驗證碼 ${params.minutes} 分鐘內有效。請勿將驗證碼告訴任何人，IdeaX 創點子團隊不會向您索取驗證碼。</p>`,
    footerNote: '如果這不是您本人的操作，請忽略這封信，您的帳號不會有任何變動。',
  });
  const text = `${params.name ? params.name + ' 您好，' : '您好，'}\n\n您的 IdeaX 創點子${purposeText}驗證碼：${params.code}\n${params.minutes} 分鐘內有效，請勿告訴任何人。\n\n如果這不是您本人的操作，請忽略這封信。\n\nIdeaX 創點子團隊\n${getSiteUrl()}`;
  return { subject, html, text };
}

export function welcomeEmail(params: { name?: string; verifyUrl?: string }) {
  const site = getSiteUrl();
  const hello = params.name ? `${escapeHtml(params.name)} 您好，` : '您好，';
  const subject = params.verifyUrl ? '歡迎加入 IdeaX 創點子！請驗證您的 Email' : '歡迎加入 IdeaX 創點子！';
  const verifyPart = params.verifyUrl
    ? `<p style="margin:0 0 14px 0;">先按下方按鈕驗證 Email，之後才能收到解答、懸賞與提領相關通知。</p>`
    : '';
  const html = renderLayout({
    preheader: '帳號已建立，三步開始使用 IdeaX 創點子',
    heading: '歡迎加入 IdeaX 創點子 🎉',
    bodyHtml: `<p style="margin:0 0 14px 0;">${hello}您的帳號已經建立完成。</p>
      ${verifyPart}
      <p style="margin:0 0 6px 0;font-weight:800;color:#17140F;">接下來可以這樣開始：</p>
      <p style="margin:0 0 4px 0;">💡 <b>有問題</b>：發布問題或設定懸賞，讓懂的人給你答案</p>
      <p style="margin:0 0 4px 0;">🛡 <b>能解題</b>：到問題市場提出方案，解題拿賞金</p>
      <p style="margin:0 0 16px 0;">🏆 <b>有點子</b>：參加創星季，讓更多人支持你的提案</p>`,
    button: params.verifyUrl ? { label: '驗證我的 Email', url: params.verifyUrl } : { label: '前往 IdeaX 創點子', url: site },
    footerNote: params.verifyUrl ? '按鈕無法點選時，請將這個連結貼到瀏覽器：' + params.verifyUrl : undefined,
  });
  const text = `${params.name ? params.name + ' 您好，' : '您好，'}\n\n歡迎加入 IdeaX 創點子，您的帳號已經建立完成。\n${
    params.verifyUrl ? `\n請開啟以下連結驗證 Email：\n${params.verifyUrl}\n` : ''
  }\n有問題：發布問題或設定懸賞\n能解題：到問題市場提出方案\n有點子：參加創星季\n\nIdeaX 創點子團隊\n${site}`;
  return { subject, html, text };
}

export function passwordChangedEmail(params: { name?: string }) {
  const hello = params.name ? `${escapeHtml(params.name)} 您好，` : '您好，';
  const subject = '您的 IdeaX 創點子密碼已變更';
  const html = renderLayout({
    preheader: '您的帳號密碼剛剛完成變更',
    heading: '密碼已變更',
    bodyHtml: `<p style="margin:0 0 12px 0;">${hello}您的 IdeaX 創點子帳號密碼剛剛完成變更。</p>
      <p style="margin:0;">如果這是您本人的操作，不需要做任何事。<b>如果不是您本人</b>，請立即使用「忘記密碼」重設密碼，並回覆這封信告訴我們。</p>`,
    button: { label: '前往登入', url: getSiteUrl() },
  });
  const text = `${params.name ? params.name + ' 您好，' : '您好，'}\n\n您的 IdeaX 創點子帳號密碼剛剛完成變更。\n如果不是您本人，請立即使用「忘記密碼」重設密碼，並回覆這封信告訴我們。\n\nIdeaX 創點子團隊\n${getSiteUrl()}`;
  return { subject, html, text };
}

export function expertReviewEmail(params: {
  name?: string;
  approved: boolean;
  note: string;
  isJudgeSelected?: boolean;
}) {
  const hello = `${escapeHtml(params.name || '專家')} 您好，`;
  const note = escapeHtml(params.note).replace(/\n/g, '<br>');
  const subject = params.approved
    ? `【IdeaX 創星季】您的專家資格審核已通過${params.isJudgeSelected ? '，並獲選為決選評審' : ''}`
    : '【IdeaX 創星季】專家資格審核結果通知';
  const box = (bg: string, border: string, inner: string) =>
    `<div style="margin:14px 0;padding:14px 16px;border-radius:14px;background:${bg};border:1px solid ${border};">${inner}</div>`;
  const bodyHtml = params.approved
    ? `<p style="margin:0 0 10px 0;">${hello}感謝您參與 IdeaX 創星季，您的<b>專家資格審核已通過</b>。</p>
       ${box(
         '#ECFDF5',
         '#A7F3D0',
         `<p style="margin:0 0 6px 0;font-weight:800;color:#065F46;">已為您開通：</p>
          <p style="margin:0;color:#047857;">・專家評選額度（創星幣）已撥入帳號<br>・可審閱所有公開提案並注資支持${
            params.isJudgeSelected ? '<br>・<b>決選評審權限</b>：可為決選提案評分' : ''
          }</p>`
       )}
       <p style="margin:0 0 4px 0;"><b>審核備註：</b><br>${note}</p>`
    : `<p style="margin:0 0 10px 0;">${hello}感謝您申請 IdeaX 創星季專家資格。這次的申請<b>暫未通過</b>。</p>
       ${box('#FFF1F2', '#FECDD3', `<p style="margin:0 0 4px 0;font-weight:800;color:#9F1239;">審核說明：</p><p style="margin:0;color:#BE123C;">${note}</p>`)}
       <p style="margin:0;">您可以登入平台補充證明文件後重新送出申請，有疑問也歡迎直接回覆這封信。</p>`;
  const html = renderLayout({
    preheader: params.approved ? '專家資格審核通過，現在就能開始評選' : '專家資格審核結果通知',
    heading: params.approved ? '🎉 專家資格審核通過' : '專家資格審核結果',
    bodyHtml,
    button: { label: params.approved ? '前往創星季開始評選' : '登入補充資料', url: getSiteUrl() },
  });
  const text = `${params.name || '專家'} 您好，\n\n${
    params.approved ? '您的 IdeaX 創星季專家資格審核已通過。' : '您的 IdeaX 創星季專家資格申請這次暫未通過。'
  }\n\n${params.approved ? '審核備註' : '審核說明'}：${params.note}\n\nIdeaX 創點子團隊\n${getSiteUrl()}`;
  return { subject, html, text };
}
