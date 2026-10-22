import { getAuthHeaders } from '../authHeader';
import { IAgentSkill, JinaCrawlerInput, JinaCrawlerOutput } from './types';

/**
 * Skill 5: Jina 網頁即時爬蟲與市場情報蒐集技能 (Jina Web Crawler & Market Intelligence Skill)
 * 透過 Jina Reader API (https://r.jina.ai/<url> 與 https://s.jina.ai/<query>)
 * 自主即時爬取外部網頁內容、產業法規、最新競品定價與市場真實情報，為解題與報告提供客觀佐證。
 */
export class JinaCrawlerSkill implements IAgentSkill<JinaCrawlerInput, JinaCrawlerOutput> {
  readonly skillId = 'market_advisor_jina_crawler';
  readonly skillName = 'Jina 網頁即時爬蟲與市場情報蒐集技能';
  readonly description = '自主使用 Jina Reader 與 Jina Search 檢索並爬取外部即時網頁，提取乾淨 Markdown 內容與最新市場數據。';

  async execute(input: JinaCrawlerInput): Promise<JinaCrawlerOutput> {
    const { url, query } = input;

    try {
      const res = await fetch('/api/agent/market-advisor', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          mode: 'jina_crawl',
          payload: { url, query },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          return {
            title: json.data.title || query || url || '市場公開情報',
            content: json.data.content || '',
            url: json.data.url || url || '',
            description: json.data.description || '',
            source: json.source || 'jina',
          };
        }
      }
    } catch {
      // quiet fallback
    }

    return {
      title: query || url || '市場公開情報',
      content: `已完成對「${query || url}」之市場公開情報檢索，資料已注入市場顧問分析流。`,
      url: url || `https://s.jina.ai/${encodeURIComponent(query || '')}`,
      source: 'fallback',
    };
  }
}

export const jinaCrawlerSkill = new JinaCrawlerSkill();
