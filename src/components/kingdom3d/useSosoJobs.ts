import { useCallback, useRef, useState } from 'react';

/** 求職廟搜搜：用自然語言說需求 → 匯職缺的理解與搜尋（免費功能）→ 結果寫到兩旁畫卷與側欄 */
export interface SosoJob {
  id: string;
  title: string;
  company?: string;
  location?: string;
  salaryText?: string;
  url?: string;
  urlKind?: 'direct' | 'search';
  sourcePlatform?: string;
  description?: string;
  benefits?: string;
  experience?: string;
  education?: string;
  industry?: string;
  category?: string;
  workEnvironment?: string;
  postedAtText?: string;
}
export interface SosoMsg {
  from: 'me' | 'soso';
  text: string;
}
export interface SosoState {
  msgs: SosoMsg[];
  busy: boolean;
  brief: string;
  canSearch: boolean;
  status: 'idle' | 'loading' | 'done';
  jobs: SosoJob[];
}

const INTRO: SosoMsg = {
  from: 'soso',
  text: '我是搜搜！用自己的話告訴我想找什麼工作就好，例如「台北的前端工程師，月薪五萬以上，可以遠端」。我找到的職缺會寫在兩旁的畫卷上（只有你看得到），也可以在這裡查看。',
};

export function useSosoJobs(onResults: (jobs: SosoJob[], status: SosoState['status'], brief: string) => void) {
  const [st, setSt] = useState<SosoState>({ msgs: [INTRO], busy: false, brief: '', canSearch: false, status: 'idle', jobs: [] });
  const convRef = useRef<string>('');
  const stRef = useRef(st);
  stRef.current = st;
  const visitorId = () => {
    try {
      return localStorage.getItem('ideax_user_id') || undefined;
    } catch {
      return undefined;
    }
  };

  const search = useCallback(
    async (brief: string) => {
      if (!brief) return;
      setSt((s) => ({ ...s, busy: true, status: 'loading', canSearch: false }));
      onResults([], 'loading', brief);
      try {
        const res = await fetch('/api/job-explorer/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: brief, filters: { userBaseCity: '台北市' }, conversationId: convRef.current || undefined, visitorId: visitorId() }),
        });
        const data = await res.json().catch(() => null);
        const jobs: SosoJob[] = res.ok && data?.success && Array.isArray(data.jobs) ? data.jobs.slice(0, 30) : [];
        setSt((s) => ({
          ...s,
          busy: false,
          status: 'done',
          jobs,
          msgs: [
            ...s.msgs,
            {
              from: 'soso',
              text: jobs.length
                ? `找到 ${jobs.length} 筆在招職缺，前 ${Math.min(10, jobs.length)} 筆寫在兩旁畫卷上了；全部可以在下方「看找到的職缺」查看。`
                : res.ok
                ? '這次沒有找到符合的職缺，換個說法或放寬條件再試試看。'
                : '搜尋時出了點狀況，請稍後再試一次。',
            },
          ],
        }));
        onResults(jobs, 'done', brief);
      } catch {
        setSt((s) => ({ ...s, busy: false, status: 'done', jobs: [], msgs: [...s.msgs, { from: 'soso', text: '連線不太順，請稍後再試一次。' }] }));
        onResults([], 'done', brief);
      }
    },
    [onResults]
  );

  const send = useCallback(
    async (text: string) => {
      const msg = text.trim().slice(0, 600);
      if (!msg || stRef.current.busy) return;
      const prev = stRef.current;
      setSt((s) => ({ ...s, busy: true, msgs: [...s.msgs, { from: 'me', text: msg }] }));
      try {
        const res = await fetch('/api/job-explorer/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msg,
            previousBrief: prev.brief,
            conversationHistory: prev.msgs.filter((m) => m.from === 'me').map((m) => m.text),
            conversationId: convRef.current || undefined,
            visitorId: visitorId(),
            filters: { userBaseCity: '台北市' },
          }),
        });
        const data = await res.json().catch(() => null);
        if (data?.difyConversationId || data?.conversationId) convRef.current = data.difyConversationId || data.conversationId;
        const brief = (typeof data?.confirmedBrief === 'string' && data.confirmedBrief.trim()) || (prev.brief ? `${prev.brief}、${msg}` : msg);
        const reply = (typeof data?.reply === 'string' && data.reply.trim()) || '收到！我照這個條件幫你找。';
        const needMore = Boolean(data?.isAmbiguous) || Boolean(data?.hasMoreQuestions);
        setSt((s) => ({ ...s, busy: false, brief, canSearch: true, msgs: [...s.msgs, { from: 'soso', text: reply }] }));
        if (!needMore) await search(brief);
      } catch {
        setSt((s) => ({ ...s, busy: false, brief: prev.brief ? `${prev.brief}、${msg}` : msg, canSearch: true, msgs: [...s.msgs, { from: 'soso', text: '我先記下來了，按「就照這個條件找」我就去找。' }] }));
      }
    },
    [search]
  );

  const reset = useCallback(() => {
    convRef.current = '';
    setSt({ msgs: [INTRO], busy: false, brief: '', canSearch: false, status: 'idle', jobs: [] });
    onResults([], 'idle', '');
  }, [onResults]);

  return { soso: st, sendSoso: send, searchSoso: search, resetSoso: reset };
}
