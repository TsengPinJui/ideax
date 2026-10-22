/**
 * 已知支援 iframe 互動預覽的作品託管平台。
 * 前端用來換成官方嵌入網址，後端 check-embed 用來略過不準確的標頭檢查。
 */

export type EmbedPlatform = 'streamlit' | 'huggingface' | null;

export interface EmbedTarget {
  /** 放進 iframe 的網址 */
  embedUrl: string;
  /** 「在新分頁開啟」用的網址（不帶嵌入參數） */
  openUrl: string;
  platform: EmbedPlatform;
}

const isStreamlitHost = (host: string) =>
  host === 'streamlit.app' || host.endsWith('.streamlit.app') || host === 'share.streamlit.io';

const isHfSpaceHost = (host: string) => host.endsWith('.hf.space');

/** 依網址判斷託管平台 */
export function detectEmbedPlatform(rawUrl: string): EmbedPlatform {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    if (isStreamlitHost(host)) return 'streamlit';
    if (isHfSpaceHost(host)) return 'huggingface';
    if ((host === 'huggingface.co' || host === 'www.huggingface.co') && /^\/spaces\/[^/]+\/[^/]+/.test(u.pathname)) {
      return 'huggingface';
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** 平台是否為已知可嵌入（後端可直接回 canEmbed: true） */
export function isKnownEmbeddableHost(host: string): boolean {
  const h = host.toLowerCase();
  return (h !== 'share.streamlit.io' && isStreamlitHost(h)) || isHfSpaceHost(h);
}

/** 轉成各平台官方的嵌入網址 */
export function toEmbedTarget(rawUrl: string): EmbedTarget {
  const openUrl = (rawUrl || '').trim();
  const platform = detectEmbedPlatform(openUrl);
  if (!platform) return { embedUrl: openUrl, openUrl, platform };

  try {
    const u = new URL(openUrl);
    const host = u.hostname.toLowerCase();

    if (platform === 'streamlit') {
      // Streamlit Community Cloud：公開 App 需加上 ?embed=true 才能正常內嵌
      // （不強制主題，保留作者自己的 App 設計）
      if (!u.searchParams.has('embed')) u.searchParams.set('embed', 'true');
      return { embedUrl: u.toString(), openUrl, platform };
    }

    if (platform === 'huggingface' && !isHfSpaceHost(host)) {
      // huggingface.co/spaces/{owner}/{space} → https://{owner}-{space}.hf.space
      const [, , owner, space] = u.pathname.split('/');
      const slug = `${owner}-${space}`.toLowerCase().replace(/[_.]/g, '-');
      return { embedUrl: `https://${slug}.hf.space/`, openUrl, platform };
    }
  } catch {
    /* ignore */
  }
  return { embedUrl: openUrl, openUrl, platform };
}

export const EMBED_PLATFORM_LABEL: Record<Exclude<EmbedPlatform, null>, string> = {
  streamlit: 'Streamlit',
  huggingface: 'Hugging Face Spaces',
};
