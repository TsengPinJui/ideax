import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import JellyMascot from './JellyMascot';
import { supportsWebGL } from '../../utils/webglSupport';


export type NewProposalNotice = { id: string; kind: 'proposal' | 'work'; at: number };

const NEW_WINDOW_MS = 7 * 86400000; // 只提醒最近 7 天內刊登的

const isSmallScreen = () => typeof window !== 'undefined' && window.innerWidth < 640;

/** 右下角燈泡吉祥物的外殼：讀取管理員設定、判斷能否顯示、延遲初始化 3D 本體 */
export const MascotHost: React.FC<{ hidden?: boolean }> = ({ hidden }) => {
  const { mascotConfig, currentUser, questions } = useApp();
  // 最新一篇「創新提案」或「刊登作品」（別人發的、真實貼文）
  const latestNew = useMemo<NewProposalNotice | null>(() => {
    const now = Date.now();
    let best: NewProposalNotice | null = null;
    for (const q of questions || []) {
      if (q.postType !== 'innovation_proposal' && q.postType !== 'vibecoding_app') continue;
      if (q.isSimulated || q.status === 'delisted' || q.authorId === currentUser?.id) continue;
      const at = Date.parse(q.createdAt);
      if (!Number.isFinite(at) || at > now + 60000 || now - at > NEW_WINDOW_MS) continue;
      if (!best || at > best.at) best = { id: q.id, kind: q.postType === 'vibecoding_app' ? 'work' : 'proposal', at };
    }
    return best;
  }, [questions, currentUser?.id]);
  const [ready, setReady] = useState(false);
  const [small, setSmall] = useState(isSmallScreen);

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (cancelled || !supportsWebGL()) return;
      const w = window as any;
      if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(() => !cancelled && setReady(true), { timeout: 4000 });
      else window.setTimeout(() => !cancelled && setReady(true), 1500);
    };
    // 等頁面載完再啟動 3D；有圖片一直載不完時，最多等 8 秒也照樣出現
    let started = false;
    const startOnce = () => { if (!started) { started = true; start(); } };
    const t = window.setTimeout(() => {
      if (document.readyState === 'complete') startOnce();
      else window.addEventListener('load', startOnce, { once: true });
    }, 1200);
    const fallback = window.setTimeout(startOnce, 8000);
    const onResize = () => setSmall(isSmallScreen());
    const onSearchAccompany = () => {
      if (supportsWebGL()) setReady(true);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('ideax:mascot-search-accompany', onSearchAccompany);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.clearTimeout(fallback);
      window.removeEventListener('load', startOnce);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('ideax:mascot-search-accompany', onSearchAccompany);
    };
  }, []);

  if (!ready || hidden || !mascotConfig.enabled || (small && !mascotConfig.showOnMobile)) return null;
  return <JellyMascot config={mascotConfig} userId={currentUser?.id} newProposal={latestNew} />;
};
