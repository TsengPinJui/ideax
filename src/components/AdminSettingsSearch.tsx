import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, CornerDownLeft } from 'lucide-react';

/**
 * 管理員設定搜尋框：輸入關鍵字（例如「小燈泡」「封鎖」「抽成」），
 * 列出在哪一個後台分頁，點一下就切過去，並在頁面上標出關鍵字出現的位置。
 * 在目前頁面按 Enter，會一個一個跳到這頁裡出現關鍵字的地方。
 */
type Entry = { tab: string; label: string; where: string; keywords: string[] };

const INDEX: Entry[] = [
  { tab: 'overview', label: '管理儀表板', where: '總覽', keywords: ['儀表板', '總覽', '流量', '訪客', '在線人數', '待處理', '統計', '數據', '播放區', '優秀作品', '付費推播', '自選', '首頁', '創點子'] },
  { tab: 'points_receivables', label: '點數 & 收支', where: '金流與案件', keywords: ['點數', '收支', '轉入點數', '撥款', '提領', '託管', '餘額', '應收', '打賞'] },
  { tab: 'transactions', label: '交易管理', where: '金流與案件', keywords: ['交易', '退款', '發票', '收據', '對帳', '金流', '付款', '憑證'] },
  { tab: 'admin_cases', label: '案件管理', where: '金流與案件', keywords: ['案件', '驗收', '交付', '爭議', '合約', '懸賞', '進度'] },
  { tab: 'admin_questions', label: '問題管理', where: '金流與案件', keywords: ['問題', '貼文', '下架', '違規', '精選', '刪除', '模擬資料', '示範資料', '痛點', '提案', '圓餅圖'] },
  { tab: 'admin_user_management', label: '用戶管理', where: '用戶審核', keywords: ['用戶', '會員', '帳號', '封鎖', '停權', '解除封鎖', '刪除帳號', '測試帳號', '管理員授權', '最近上線', '註冊'] },
  { tab: 'admin_certifications', label: '受理認證', where: '用戶審核', keywords: ['認證', '實名', '專家認證', '審核', '身分證', '證照'] },
  { tab: 'admin_user_analytics', label: '用戶分佈與習慣統計', where: '用戶審核', keywords: ['用戶分佈', '習慣', '問卷', '統計', 'excel', '匯出', '用戶畫像'] },
  { tab: 'admin_aicrm', label: 'AI-CRM 與 Agent 測試', where: 'AI與方案', keywords: ['ai', 'crm', 'agent', '小燈泡', '吉祥物', '泡泡文字', '音效', '彈性', 'dify', '金鑰', '轉接', '客服助理', '市場顧問', '搜搜', '探險家', '通知規則', '特助', '測試', 'gemini', 'gpt', 'openai', 'luna', '模型', 'ai模型'] },
  { tab: 'subscriptions', label: '會員方案與費率', where: 'AI與方案', keywords: ['方案', '費率', '月費', '抽成', '服務費', '訂閱', '達人', '專家級', '權威', '大師', '減免'] },
  { tab: 'profile', label: '管理員設定', where: '帳號', keywords: ['管理員設定', '頭像', '營運模式', '正常營運', '無金流', '競賽模式', '測試模式', '密碼', '收退款帳戶', '隱私', '名稱顯示', '切換身分'] },
  { tab: 'admin_mail_disputes', label: '申訴郵件與客服', where: '信封圖示', keywords: ['申訴', '郵件', '客服', '工單', 'faq', '回報', '退款申請', '爭議'] },
  { tab: 'about_and_support', label: '關於IdeaX', where: '帳號', keywords: ['關於', '版本', '更新紀錄', '平台介紹', '原創ip'] },
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

/** 在後台內容區裡找出所有出現關鍵字的元素 */
function findInPage(q: string): HTMLElement[] {
  const root = document.querySelector('[data-admin-search-root]');
  if (!root || !q) return [];
  const needle = norm(q);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const out: HTMLElement[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const el = n.parentElement;
    if (!el || out.includes(el)) continue;
    if (!norm(n.textContent || '').includes(needle)) continue;
    if (el.closest('[data-admin-search]')) continue; // 搜尋框自己不算
    if (el.offsetParent === null) continue; // 看不到的不算
    out.push(el);
    if (out.length >= 50) break;
  }
  return out;
}

function flash(el: HTMLElement) {
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const prev = { outline: el.style.outline, bg: el.style.backgroundColor, radius: el.style.borderRadius, transition: el.style.transition };
  el.style.transition = 'background-color .3s, outline-color .3s';
  el.style.outline = '3px solid #f59e0b';
  el.style.backgroundColor = 'rgba(253, 230, 138, .55)';
  el.style.borderRadius = '6px';
  window.setTimeout(() => {
    el.style.outline = prev.outline; el.style.backgroundColor = prev.bg; el.style.borderRadius = prev.radius; el.style.transition = prev.transition;
  }, 2600);
}

export const AdminSettingsSearch: React.FC<{ activeTab: string; onNavigate: (tab: string) => void; className?: string }> = ({ activeTab, onNavigate, className = '' }) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [pageHits, setPageHits] = useState<{ q: string; idx: number; total: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const needle = norm(q);
    if (!needle) return [] as Array<Entry & { hit: string }>;
    return INDEX.map((e) => {
      const hit = norm(e.label).includes(needle) ? e.label : e.keywords.find((k) => norm(k).includes(needle) || needle.includes(norm(k)));
      return hit ? { ...e, hit } : null;
    }).filter(Boolean) as Array<Entry & { hit: string }>;
  }, [q]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  /** 在目前頁面跳到第 n 個出現關鍵字的地方 */
  const jumpInPage = (query: string, idx = 0) => {
    const hits = findInPage(query);
    if (!hits.length) { setPageHits({ q: query, idx: 0, total: 0 }); return; }
    const i = idx % hits.length;
    flash(hits[i]);
    setPageHits({ q: query, idx: i, total: hits.length });
  };

  const go = (tab: string) => {
    setOpen(false);
    const query = q.trim();
    if (tab !== activeTab) onNavigate(tab);
    // 等新分頁畫好再找關鍵字
    window.setTimeout(() => jumpInPage(query, 0), tab !== activeTab ? 450 : 0);
  };

  const onEnter = () => {
    const query = q.trim();
    if (!query) return;
    // 同一個關鍵字再按 Enter：跳到這頁的下一處
    if (pageHits && pageHits.q === query && pageHits.total > 0) { jumpInPage(query, pageHits.idx + 1); return; }
    const here = findInPage(query);
    if (here.length) { setOpen(false); jumpInPage(query, 0); return; }
    if (results[0]) go(results[0].tab);
  };

  return (
    <div ref={boxRef} data-admin-search className={`relative ${className}`}>
      <div className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-2.5 py-1.5 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200">
        <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setPageHits(null); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onEnter(); }
            else if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur(); }
          }}
          placeholder="搜尋管理設定，例如：小燈泡、封鎖、抽成"
          aria-label="搜尋管理設定"
          className="min-w-0 flex-1 bg-transparent text-xs font-medium text-stone-900 outline-none placeholder:text-stone-400"
        />
        {pageHits && pageHits.total > 0 && (
          <span className="shrink-0 text-[10px] font-bold text-amber-700">{pageHits.idx + 1}/{pageHits.total}</span>
        )}
        {q && (
          <button type="button" onClick={() => { setQ(''); setPageHits(null); }} aria-label="清除" className="shrink-0 rounded p-0.5 text-stone-400 hover:text-stone-700 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && q.trim() && (
        <div className="absolute right-0 left-0 sm:left-auto sm:w-80 top-full mt-1.5 z-[60] rounded-xl border border-stone-200 bg-white shadow-xl p-1.5 text-xs">
          {results.length === 0 ? (
            <div className="px-2.5 py-2 text-stone-500">
              {pageHits && pageHits.total === 0 ? '找不到相關設定' : '沒有對應的分頁，按 Enter 在這頁裡找'}
            </div>
          ) : (
            results.map((r) => (
              <button
                key={r.tab}
                type="button"
                onClick={() => go(r.tab)}
                className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-purple-50 flex items-center justify-between gap-2 cursor-pointer ${r.tab === activeTab ? 'bg-stone-50' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block font-black text-stone-900 truncate">{r.label}</span>
                  <span className="block text-[10px] text-stone-500 truncate">{r.where}・含「{r.hit}」{r.tab === activeTab ? '・目前這頁' : ''}</span>
                </span>
                <CornerDownLeft className="w-3.5 h-3.5 text-stone-300 shrink-0" />
              </button>
            ))
          )}
          <div className="px-2.5 pt-1.5 mt-1 border-t border-stone-100 text-[10px] text-stone-400">在目前頁面按 Enter，會一個一個跳到關鍵字出現的地方</div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsSearch;
