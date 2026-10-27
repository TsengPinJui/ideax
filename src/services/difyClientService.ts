/**
 * Dify Client-Side Direct Service
 * 
 * 解決在靜態部署環境（如 www.ideax.tw 或 Firebase Hosting、CDN）下
 * 後端 Node Express API (/api/...) 回傳 404 的問題。
 * 
 * 透過瀏覽器直接發起 CORS 串流呼叫至 Dify 官方 API（https://api.dify.ai/v1），
 * 完全不使用任何假模擬資料，直接獲取真實 Dify Agent 思考與推理結果。
 */

export type DifyAgentType = 'aicrm_agent' | 'market_advisor' | 'cs_agent' | 'explorer_agent';

export interface DifyConfig {
  baseUrl: string;
  aicrmKey: string;
  csKey: string;
  marketAdvisorKey: string;
  explorerKey: string;
  aicrmWebUrl: string;
  explorerWebUrl: string;
}

const STORAGE_KEYS = {
  BASE_URL: 'ideax_dify_base_url',
  AICRM_KEY: 'ideax_dify_aicrm_key',
  CS_KEY: 'ideax_dify_cs_key',
  MARKET_KEY: 'ideax_dify_market_key',
  EXPLORER_KEY: 'ideax_dify_explorer_key',
  WEB_URL: 'ideax_dify_aicrm_web_url',
  EXPLORER_WEB_URL: 'ideax_dify_explorer_web_url',
};

// 預設端點（金鑰不寫死在前端，需由管理員於後台設定）
const DEFAULT_CONFIG: DifyConfig = {
  baseUrl: (process.env.DIFY_API_BASE_URL || 'https://api.dify.ai/v1').replace(/\/+$/, ''),
  aicrmKey: process.env.DIFY_AICRM_API_KEY || '',
  csKey: process.env.DIFY_CS_API_KEY || '',
  marketAdvisorKey: process.env.DIFY_MARKET_ADVISOR_API_KEY || '',
  explorerKey: process.env.DIFY_EXPLORER_API_KEY || '',
  aicrmWebUrl: process.env.DIFY_AICRM_WEB_URL && process.env.DIFY_AICRM_WEB_URL.includes('udify')
    ? process.env.DIFY_AICRM_WEB_URL
    : 'https://udify.app/agent/BnAiF81AGw454x0u',
  explorerWebUrl: 'https://udify.app/agent/bEV82Byu5zk9O4Q5',
};

export function getDifyConfig(): DifyConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  return {
    baseUrl: localStorage.getItem(STORAGE_KEYS.BASE_URL) || DEFAULT_CONFIG.baseUrl,
    aicrmKey: localStorage.getItem(STORAGE_KEYS.AICRM_KEY) || DEFAULT_CONFIG.aicrmKey,
    csKey: localStorage.getItem(STORAGE_KEYS.CS_KEY) || DEFAULT_CONFIG.csKey,
    marketAdvisorKey: localStorage.getItem(STORAGE_KEYS.MARKET_KEY) || DEFAULT_CONFIG.marketAdvisorKey,
    explorerKey: localStorage.getItem(STORAGE_KEYS.EXPLORER_KEY) || DEFAULT_CONFIG.explorerKey,
    aicrmWebUrl: localStorage.getItem(STORAGE_KEYS.WEB_URL) || DEFAULT_CONFIG.aicrmWebUrl,
    explorerWebUrl: localStorage.getItem(STORAGE_KEYS.EXPLORER_WEB_URL) || DEFAULT_CONFIG.explorerWebUrl,
  };
}

export function saveDifyConfig(partial: Partial<DifyConfig>): DifyConfig {
  if (typeof window !== 'undefined') {
    if (partial.baseUrl !== undefined) localStorage.setItem(STORAGE_KEYS.BASE_URL, partial.baseUrl.trim().replace(/\/+$/, ''));
    if (partial.aicrmKey !== undefined) localStorage.setItem(STORAGE_KEYS.AICRM_KEY, partial.aicrmKey.trim());
    if (partial.csKey !== undefined) localStorage.setItem(STORAGE_KEYS.CS_KEY, partial.csKey.trim());
    if (partial.marketAdvisorKey !== undefined) localStorage.setItem(STORAGE_KEYS.MARKET_KEY, partial.marketAdvisorKey.trim());
    if (partial.explorerKey !== undefined) localStorage.setItem(STORAGE_KEYS.EXPLORER_KEY, partial.explorerKey.trim());
    if (partial.aicrmWebUrl !== undefined) localStorage.setItem(STORAGE_KEYS.WEB_URL, partial.aicrmWebUrl.trim());
    if (partial.explorerWebUrl !== undefined) localStorage.setItem(STORAGE_KEYS.EXPLORER_WEB_URL, partial.explorerWebUrl.trim());
  }
  return getDifyConfig();
}

export function resetDifyConfig(): DifyConfig {
  if (typeof window !== 'undefined') {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  }
  return getDifyConfig();
}

export function getDifyKeyForAgent(agentType: DifyAgentType): string {
  const config = getDifyConfig();
  switch (agentType) {
    case 'aicrm_agent':
      return config.aicrmKey;
    case 'cs_agent':
      return config.csKey;
    case 'market_advisor':
      return config.marketAdvisorKey;
    case 'explorer_agent':
      return config.explorerKey || config.explorerWebUrl;
    default:
      return config.aicrmKey;
  }
}

export function extractJsonFromText(text: string): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {}

  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {}
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } catch {}
  }

  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(text.substring(firstBracket, lastBracket + 1));
    } catch {}
  }

  return null;
}

/**
 * 強制將任何舊稱「大獵場 (Talent Hunt)」正名為「IdeaX創點子」
 */
export function normalizeIdeaXBrand(text: string): string {
  if (!text) return text;
  return text
    .replace(/大獵場\s*[（(]\s*Talent\s*Hunt\s*[)）]/gi, 'IdeaX創點子')
    .replace(/大獵場/g, 'IdeaX創點子')
    .replace(/Talent\s*Hunt/gi, 'IdeaX創點子');
}

export interface DifyDirectCallParams {
  agentType?: DifyAgentType;
  apiKey?: string;
  query: string;
  inputs?: Record<string, any>;
  user?: string;
  conversationId?: string;
  timeoutMs?: number;
  onChunk?: (chunk: string, accumulated: string) => void;
}

export interface DifyDirectCallResult {
  success: boolean;
  source: 'dify-browser-direct' | 'dify-multi-batch' | string;
  rawOutput: string;
  parsedJson: any;
  latencyMs: number;
  messageId: string;
  conversationId: string;
  agentKey: string;
  thoughts?: string;
  notice?: string;
}

/**
 * 瀏覽器直連 Dify API 串流呼叫（支援分批多次回傳與前端統一整合顯示）
 */
export async function callDifyClientDirect(params: DifyDirectCallParams): Promise<DifyDirectCallResult> {
  const config = getDifyConfig();
  const agentType = params.agentType || 'aicrm_agent';
  const apiKey = params.apiKey || getDifyKeyForAgent(agentType);
  const baseUrl = config.baseUrl;

  if (!apiKey) {
    throw new Error(`找不到 ${agentType} 對應的 Dify API Key，請至後台設定金鑰。`);
  }

  const startTime = Date.now();
  const maskedKey = apiKey.length > 10
    ? `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`
    : '已配置金鑰';

  // 若為 udify.app 網址或代碼，交由後端代理認證串流以免瀏覽器 CORS 阻擋
  if (/udify\.app\/(?:agent|chat)\/([A-Za-z0-9_-]+)/i.test(apiKey)) {
    throw new Error('UDIFY_WEB_APP_REQUIRES_SERVER_PROXY');
  }

  const controller = new AbortController();
  const timeoutMs = params.timeoutMs || 35000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const endpoint = `${baseUrl}/chat-messages`;
  const sanitizedUser = (params.user || `ideax_web_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');

  // 強制注入品牌正名（IdeaX創點子，嚴禁出現大獵場 Talent Hunt）與跳過讀取本地檔案保護
  const effectiveQuery = `${params.query}\n\n【最高系統指令：1. 本平台正式名稱為「IdeaX創點子」，請一律稱呼「IdeaX創點子」，絕對禁止出現舊稱「大獵場」或「Talent Hunt」字樣。2. 絕對禁止執行 shell_run 或 dify-agent config files pull，請跳過讀取本地檔案步驟，直接回答或執行搜尋，並精簡輸出以避免超過最大輸出與迭代上限！】`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: params.inputs || {},
        query: effectiveQuery,
        response_mode: 'streaming',
        conversation_id: params.conversationId || '',
        user: sanitizedUser,
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let errorMsg = `Dify API 回應錯誤 (HTTP ${res.status}): ${errText || res.statusText}`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.message) {
          errorMsg = `Dify 錯誤 (${errJson.code || res.status}): ${errJson.message}`;
        }
      } catch {}
      throw new Error(errorMsg);
    }

    if (!res.body) {
      throw new Error('Dify 伺服器未回傳串流資料主體');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let agentAnswer = '';
    let workflowAnswer = '';
    let thoughts = '';
    let convId = params.conversationId || '';
    let msgId = '';
    let hitLengthLimit = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data.conversation_id) convId = data.conversation_id;
          if (data.message_id) msgId = data.message_id;

          if (data.event === 'agent_thought' && data.thought) {
            thoughts += normalizeIdeaXBrand(data.thought);
          }

          if (data.event === 'agent_message' && data.answer) {
            const chunk = normalizeIdeaXBrand(data.answer);
            agentAnswer += chunk;
            if (params.onChunk) {
              params.onChunk(chunk, normalizeIdeaXBrand(agentAnswer));
            }
          } else if (data.event === 'message' && data.answer) {
            const chunk = normalizeIdeaXBrand(data.answer);
            workflowAnswer += chunk;
            if (!agentAnswer && params.onChunk) {
              params.onChunk(chunk, normalizeIdeaXBrand(workflowAnswer));
            }
          }

          // 遇到超過輸出長度／迭代次數錯誤時，自動轉入「分批回傳＋前端統一整合」
          if (data.event === 'error') {
            const errCode = String(data.code || '');
            const errMsg = String(data.message || '');
            const isExceededRetries = /exceeded maximum output retries|超過最大輸出|output retries|max tokens|length/i.test(errMsg);
            if (isExceededRetries) {
              hitLengthLimit = true;
              break;
            }
            throw new Error(`Dify 內部事件錯誤: ${errMsg || errCode || '未知錯誤'}`);
          }
        } catch (parseErr: any) {
          if (parseErr.message?.startsWith('Dify 內部事件錯誤')) {
            throw parseErr;
          }
        }
      }
      if (hitLengthLimit) break;
    }

    const finalOutput = normalizeIdeaXBrand(agentAnswer.trim() || workflowAnswer.trim());

    if (!finalOutput && !thoughts) {
      throw new Error('Dify Agent 執行完畢但未回傳文字內容，請檢查 Agent 提示詞或工作流發布設定。');
    }

    const latencyMs = Date.now() - startTime;
    const parsedJson = extractJsonFromText(finalOutput);

    return {
      success: true,
      source: 'dify-browser-direct',
      rawOutput: finalOutput || normalizeIdeaXBrand(thoughts.trim()),
      parsedJson,
      latencyMs,
      messageId: msgId || `dify-msg-${Date.now()}`,
      conversationId: convId,
      agentKey: maskedKey,
      thoughts: normalizeIdeaXBrand(thoughts.trim()) || undefined,
    };
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`連線 Dify 超時（已等待超過 ${Math.round(timeoutMs / 1000)} 秒），請檢查網路或稍後再試。`);
    }
    throw err;
  }
}
