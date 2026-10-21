/**
 * 內建 AI 模型：OpenAI GPT-6 Luna（預設）、Anthropic Claude Haiku 5.5、Google Gemini 3.8 Flash。
 * - 管理員在後台選一個使用中的模型，三個模型各自有推理強度，存在 platform_settings/global；伺服器每 60 秒重讀一次
 * - 選 Luna 或 Haiku 時先用它；沒有金鑰、逾時或出錯，呼叫端自動退回 Gemini
 * - 金鑰放在 Vercel 環境變數：OPENAI_API_KEY、CLAUDE_API_KEY（也接受 ANTHROPIC_API_KEY）、GEMINI_API_KEY；只在伺服器使用，不會傳到前端
 * - 可用 OPENAI_MODEL、ANTHROPIC_MODEL 換模型
 */
import { ThinkingLevel } from '@google/genai';
import { adminDb } from './competitionService';

export type AiProvider = 'openai' | 'anthropic' | 'gemini';
export const AI_PROVIDERS: AiProvider[] = ['openai', 'anthropic', 'gemini'];

export const OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-6-luna').trim();
export const ANTHROPIC_MODEL = (process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5').trim();
export const GEMINI_MAIN_MODEL = 'gemini-3.8-flash';
export const MODEL_OF: Record<AiProvider, string> = { openai: OPENAI_MODEL, anthropic: ANTHROPIC_MODEL, gemini: GEMINI_MAIN_MODEL };

/** Claude 金鑰：用 CLAUDE_API_KEY（舊名稱 ANTHROPIC_API_KEY 也可以） */
const claudeKey = () => (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '').trim();

export const hasProviderKey = (p: AiProvider): boolean =>
  p === 'openai' ? Boolean((process.env.OPENAI_API_KEY || '').trim())
  : p === 'anthropic' ? Boolean(claudeKey())
  : Boolean((process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim());
export const hasOpenAiKey = () => hasProviderKey('openai');

/** 推理強度：越高越會想、越準，但越慢、推理 token 也越多。none＝不推理（最快） */
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh';
export const REASONING_EFFORTS: ReasoningEffort[] = ['none', 'low', 'medium', 'high', 'xhigh'];
/** 各模型可選的強度（Gemini 3.8 Flash 只有低／中／高三段） */
export const EFFORT_OPTIONS: Record<AiProvider, ReasoningEffort[]> = {
  openai: ['none', 'low', 'medium', 'high', 'xhigh'],
  anthropic: ['none', 'low', 'medium', 'high', 'xhigh'],
  gemini: ['low', 'medium', 'high'],
};
export const DEFAULT_EFFORT: ReasoningEffort = 'medium';
/** 依推理強度給的最長等待時間 */
const EFFORT_TIMEOUT_MS: Record<ReasoningEffort, number> = { none: 15000, low: 20000, medium: 30000, high: 45000, xhigh: 60000 };
export const timeoutForEffort = (e: ReasoningEffort) => EFFORT_TIMEOUT_MS[e];

type Settings = { provider: AiProvider; efforts: Record<AiProvider, ReasoningEffort>; at: number };
let cached: Settings = { provider: 'openai', efforts: { openai: DEFAULT_EFFORT, anthropic: DEFAULT_EFFORT, gemini: DEFAULT_EFFORT }, at: 0 };

const lastError: Record<AiProvider, string> = { openai: '', anthropic: '', gemini: '' };
export const getLastProviderError = (p: AiProvider) => lastError[p];
export const getLastOpenAiError = () => lastError.openai;

const validEffort = (p: AiProvider, v: any): v is ReasoningEffort => EFFORT_OPTIONS[p].includes(v);

/** 從資料庫讀模型設定（60 秒內用快取） */
async function refreshSettings(): Promise<void> {
  if (Date.now() - cached.at < 60000) return;
  try {
    const snap = await adminDb.collection('platform_settings').doc('global').get();
    const d: any = snap.exists ? snap.data() : {};
    const saved = d?.aiEfforts || {};
    const efforts = { ...cached.efforts };
    for (const p of AI_PROVIDERS) {
      const v = p === 'openai' && !saved.openai ? d?.aiReasoningEffort : saved[p]; // 舊設定 aiReasoningEffort 是給 Luna 的
      efforts[p] = validEffort(p, v) ? v : DEFAULT_EFFORT;
    }
    // 沒設定過就用 GPT-6 Luna
    const provider: AiProvider = AI_PROVIDERS.includes(d?.aiProvider) ? d.aiProvider : 'openai';
    cached = { provider, efforts, at: Date.now() };
  } catch {
    cached = { ...cached, at: Date.now() };
  }
}

/** 目前使用中的模型（環境變數 AI_PROVIDER 可強制指定） */
export async function getAiProvider(): Promise<AiProvider> {
  const forced = (process.env.AI_PROVIDER || '').trim().toLowerCase() as AiProvider;
  if (AI_PROVIDERS.includes(forced)) return forced;
  await refreshSettings();
  return cached.provider;
}

export async function setAiProvider(provider: AiProvider): Promise<void> {
  await adminDb.collection('platform_settings').doc('global').set({ aiProvider: provider, aiProviderUpdatedAt: new Date().toISOString() }, { merge: true });
  cached = { ...cached, provider, at: Date.now() };
}

/** 某個模型的推理強度 */
export async function getEffort(p: AiProvider): Promise<ReasoningEffort> {
  await refreshSettings();
  return cached.efforts[p];
}
export async function getAllEfforts(): Promise<Record<AiProvider, ReasoningEffort>> {
  await refreshSettings();
  return { ...cached.efforts };
}
export async function setEffort(p: AiProvider, effort: ReasoningEffort): Promise<void> {
  if (!validEffort(p, effort)) throw new Error('推理強度不正確');
  const efforts = { ...(await getAllEfforts()), [p]: effort };
  await adminDb.collection('platform_settings').doc('global').set({ aiEfforts: efforts }, { merge: true });
  cached = { ...cached, efforts, at: Date.now() };
}

/** Gemini 3.8 Flash 的思考設定（其他 Gemini 模型不帶） */
export async function geminiThinkingFor(model: string): Promise<{ thinkingConfig?: { thinkingLevel: ThinkingLevel } }> {
  if (model !== GEMINI_MAIN_MODEL) return {};
  const e = await getEffort('gemini');
  return { thinkingConfig: { thinkingLevel: e === 'high' || e === 'xhigh' ? ThinkingLevel.HIGH : e === 'medium' ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW } };
}

type GenOpts = { prompt: string; system?: string; json?: boolean; timeoutMs?: number; effort?: ReasoningEffort };

/**
 * 用「使用中的模型」產生文字（Luna 或 Haiku）。使用中的是 Gemini、沒有金鑰或失敗時回傳 null，
 * 呼叫端照原本的流程改用 Gemini。
 */
export async function externalGenerate(opts: GenOpts): Promise<{ text: string; engine: string } | null> {
  const p = await getAiProvider();
  if (p === 'gemini' || !hasProviderKey(p)) return null;
  const text = p === 'openai' ? await openAiGenerate(opts) : await anthropicGenerate(opts);
  return text ? { text, engine: MODEL_OF[p] } : null;
}

/** 使用中的模型是不是 Luna／Haiku（而且有金鑰） */
export async function shouldUseExternal(): Promise<boolean> {
  const p = await getAiProvider();
  return p !== 'gemini' && hasProviderKey(p);
}

/**
 * 呼叫 OpenAI（Responses API）。失敗回傳 null。
 * json=true 時要求只輸出 JSON 物件（提示詞裡要有「JSON」字樣）。
 */
export async function openAiGenerate(opts: GenOpts & { omitReasoning?: boolean }): Promise<string | null> {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) { lastError.openai = '沒有設定 OPENAI_API_KEY'; return null; }
  const effort = opts.effort || (await getEffort('openai'));
  const timeoutMs = opts.timeoutMs || EFFORT_TIMEOUT_MS[effort];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body: Record<string, any> = {
      model: OPENAI_MODEL,
      input: [
        ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
        { role: 'user', content: opts.json && !/json/i.test(opts.prompt) ? `${opts.prompt}\n\n請只輸出 JSON。` : opts.prompt },
      ],
      store: false,
    };
    if (!opts.omitReasoning) body.reasoning = { effort };
    if (opts.json) body.text = { format: { type: 'json_object' } };
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok) {
      lastError.openai = `HTTP ${res.status}：${String(data?.error?.message || '').slice(0, 160)}`;
      // 不支援 reasoning 參數的模型：拿掉再試一次
      if (res.status === 400 && /reasoning/i.test(lastError.openai) && !opts.omitReasoning) {
        clearTimeout(timer);
        return openAiGenerate({ ...opts, omitReasoning: true, timeoutMs }).catch(() => null);
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
    if (!text.trim()) { lastError.openai = '回覆是空的'; return null; }
    lastError.openai = '';
    return text.trim();
  } catch (err: any) {
    lastError.openai = err?.name === 'AbortError' ? `逾時（${Math.round(timeoutMs / 1000)} 秒）` : String(err?.message || err).slice(0, 160);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 呼叫 Anthropic Claude（Messages API）。失敗回傳 null。
 * 推理強度用 output_config.effort；none＝關閉思考並用 low。
 */
export async function anthropicGenerate(opts: GenOpts): Promise<string | null> {
  const key = claudeKey();
  if (!key) { lastError.anthropic = '沒有設定 CLAUDE_API_KEY'; return null; }
  const effort = opts.effort || (await getEffort('anthropic'));
  const timeoutMs = opts.timeoutMs || EFFORT_TIMEOUT_MS[effort];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const maxTokens = effort === 'xhigh' ? 32000 : effort === 'high' ? 16000 : 8000; // 包含思考的 token
    const body: Record<string, any> = {
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: opts.json ? `${opts.prompt}\n\n請只輸出一個 JSON 物件，不要加任何說明或 markdown。` : opts.prompt }],
      thinking: effort === 'none' ? { type: 'disabled' } : { type: 'adaptive' },
      output_config: { effort: effort === 'none' ? 'low' : effort },
    };
    if (opts.system) body.system = opts.system;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok) {
      lastError.anthropic = `HTTP ${res.status}：${String(data?.error?.message || '').slice(0, 160)}`;
      return null;
    }
    const text = (Array.isArray(data?.content) ? data.content : [])
      .filter((b: any) => b?.type === 'text' && typeof b.text === 'string')
      .map((b: any) => b.text)
      .join('')
      .trim();
    if (!text) { lastError.anthropic = data?.stop_reason === 'max_tokens' ? '思考太久，超過輸出上限' : '回覆是空的'; return null; }
    lastError.anthropic = '';
    return text;
  } catch (err: any) {
    lastError.anthropic = err?.name === 'AbortError' ? `逾時（${Math.round(timeoutMs / 1000)} 秒）` : String(err?.message || err).slice(0, 160);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
