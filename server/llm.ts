/**
 * 內建 AI 模型切換：Gemini（預設）或 OpenAI GPT-5.6 Luna。
 * - 管理員在後台切換，存在 platform_settings/global.aiProvider；伺服器每 60 秒重讀一次
 * - 選 OpenAI 時先用 OpenAI；沒有金鑰、逾時或出錯，呼叫端會自動退回 Gemini
 * - 需要 Vercel 環境變數 OPENAI_API_KEY；可用 OPENAI_MODEL 換模型（預設 gpt-5.6-luna）
 * - 金鑰只在伺服器使用，不會傳到前端
 */
import { adminDb } from './competitionService';

export type AiProvider = 'gemini' | 'openai';

export const OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-5.6-luna').trim();
export const hasOpenAiKey = () => Boolean((process.env.OPENAI_API_KEY || '').trim());

let cached: { provider: AiProvider; at: number } = { provider: 'gemini', at: 0 };
let lastOpenAiError = '';
export const getLastOpenAiError = () => lastOpenAiError;

/** 目前使用的模型提供者（環境變數 AI_PROVIDER 可強制指定） */
export async function getAiProvider(): Promise<AiProvider> {
  const forced = (process.env.AI_PROVIDER || '').trim().toLowerCase();
  if (forced === 'openai' || forced === 'gemini') return forced;
  if (Date.now() - cached.at < 60000) return cached.provider;
  try {
    const snap = await adminDb.collection('platform_settings').doc('global').get();
    const v = snap.exists ? (snap.data() as any)?.aiProvider : null;
    cached = { provider: v === 'openai' ? 'openai' : 'gemini', at: Date.now() };
  } catch {
    cached = { ...cached, at: Date.now() };
  }
  return cached.provider;
}

export async function setAiProvider(provider: AiProvider): Promise<void> {
  await adminDb.collection('platform_settings').doc('global').set({ aiProvider: provider, aiProviderUpdatedAt: new Date().toISOString() }, { merge: true });
  cached = { provider, at: Date.now() };
}

/** 這次要不要用 OpenAI（選了 OpenAI 而且有金鑰） */
export async function shouldUseOpenAi(): Promise<boolean> {
  return hasOpenAiKey() && (await getAiProvider()) === 'openai';
}

/**
 * 呼叫 OpenAI（Responses API）。失敗回傳 null，讓呼叫端改用 Gemini。
 * json=true 時要求只輸出 JSON 物件（提示詞裡要有「JSON」字樣）。
 */
export async function openAiGenerate(opts: {
  prompt: string;
  system?: string;
  json?: boolean;
  timeoutMs?: number;
  /** 推理程度；'omit' 不帶這個參數（給不支援的模型） */
  effort?: 'none' | 'low' | 'medium' | 'high' | 'omit';
}): Promise<string | null> {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) { lastOpenAiError = '沒有設定 OPENAI_API_KEY'; return null; }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 25000);
  try {
    const body: Record<string, any> = {
      model: OPENAI_MODEL,
      input: [
        ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
        { role: 'user', content: opts.json && !/json/i.test(opts.prompt) ? `${opts.prompt}\n\n請只輸出 JSON。` : opts.prompt },
      ],
      store: false,
    };
    const effort = opts.effort || 'low';
    if (effort !== 'omit') body.reasoning = { effort };
    if (opts.json) body.text = { format: { type: 'json_object' } };
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok) {
      lastOpenAiError = `HTTP ${res.status}：${String(data?.error?.message || '').slice(0, 160)}`;
      // 不支援 reasoning 參數的模型：拿掉再試一次
      if (res.status === 400 && /reasoning/i.test(lastOpenAiError) && body.reasoning) {
        clearTimeout(timer);
        return openAiGenerate({ ...opts, effort: 'omit' }).catch(() => null);
      }
      return null;
    }
    const text = typeof data?.output_text === 'string' && data.output_text
      ? data.output_text
      : (Array.isArray(data?.output) ? data.output : [])
          .flatMap((o: any) => (Array.isArray(o?.content) ? o.content : []))
          .filter((c: any) => c?.type === 'output_text' && typeof c.text === 'string')
          .map((c: any) => c.text)
          .join('');
    if (!text.trim()) { lastOpenAiError = '回覆是空的'; return null; }
    lastOpenAiError = '';
    return text.trim();
  } catch (err: any) {
    lastOpenAiError = err?.name === 'AbortError' ? `逾時（${Math.round((opts.timeoutMs || 25000) / 1000)} 秒）` : String(err?.message || err).slice(0, 160);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
