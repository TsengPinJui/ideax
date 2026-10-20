import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, MapPin, Briefcase, Clock, X, IdCard } from 'lucide-react';

/**
 * 關於 IdeaX →「原創 IP 與 Agent」：介紹站上各個 Agent 角色的名字、職位與負責的業務。
 * 角色們平常都在網站各處工作，這頁只放介紹與「出沒地點」。
 */
type Agent = {
  name: string;
  title: string;
  img?: string;
  /** 創點國虛擬身分證（小圖、原圖） */
  idCard?: { thumb: string; full: string };
  intro: string;
  duties: string[];
  spots: string[];
  accent: string;
};

const AGENTS: Agent[] = [
  {
    name: '小燈泡',
    title: '調節器 Agent',
    img: '/agents/xiaodengpao.webp',
    idCard: { thumb: '/agents/idcard-xiaodengpao-thumb.webp', full: '/agents/idcard-xiaodengpao.webp' },
    intro: 'IdeaX 的站內嚮導。聽懂你想問什麼，再把問題轉給最適合的助理處理。',
    duties: ['站內導覽與功能說明', '聽懂需求、分派給合適的 Agent', '客服問題的第一線接待'],
    spots: ['全站右下角'],
    accent: 'from-amber-100 to-yellow-50 border-amber-200',
  },
  {
    name: '搜搜',
    title: '探索者 Agent、偵查與傳令',
    img: '/agents/sousou.webp',
    idCard: { thumb: '/agents/idcard-sousou-thumb.webp', full: '/agents/idcard-sousou.webp' },
    intro: '駕著筋斗雲跑遍各大求職平台，幫你把符合條件的職缺一次找齊。',
    duties: ['跨平台搜尋正職、兼職與國外職缺', '依條件整理、排序職缺', '盡量直接連到職缺本頁'],
    spots: ['匯職缺頁左下角'],
    accent: 'from-blue-100 to-sky-50 border-blue-200',
  },
  {
    name: '白喵',
    title: '市場顧問 Agent',
    img: '/agents/baimiao.webp',
    idCard: { thumb: '/agents/idcard-baimiao-thumb.webp', full: '/agents/idcard-baimiao.webp' },
    intro: '哈基米！剛被 IdeaX 聘為市場顧問，負責分析報告、找專家、獵人頭、貼標籤，偶爾還會被 call 去當和事佬。',
    duties: ['題目自動分類與貼標籤', '智慧獵頭、專家媒合', '付費深度分析報告', '交易爭議調解（和事佬）'],
    spots: ['首頁主題專區上方', '提案編輯頁', '付費獵頭', '付費分析報告', '聊天室調解'],
    accent: 'from-yellow-100 to-orange-50 border-yellow-200',
  },
];

// 還沒有角色形象的 Agent（未來會有 IP）
const UPCOMING: Pick<Agent, 'name' | 'title' | 'duties'>[] = [
  { name: '官方客服', title: '客服 Agent', duties: ['點數託管與驗收撥款說明', '交付爭議與退款政策', '會員方案與認證流程'] },
  { name: 'AICRM', title: '三合一 Agent（雷達＆軍師＆特助）', duties: ['案件雷達巡航', '成案意向分析', '建議最佳跟進時機'] },
];

// 點小圖放大看身分證；Esc 或點背景關閉
const IdCardViewer: React.FC<{ agent: Agent; onClose: () => void }> = ({ agent, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${agent.name}的創點國身分證`}
      onClick={onClose}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <img src={agent.idCard!.full} alt={`${agent.name}的創點國身分證`} className="w-full h-auto rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200" />
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-9 h-9 rounded-full bg-white text-stone-800 shadow-lg flex items-center justify-center hover:bg-stone-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>,
    document.body
  );
};

export const AgentsIntroSection: React.FC = () => {
  const [viewing, setViewing] = useState<Agent | null>(null);
  return (
  <div className="space-y-6 animate-in fade-in duration-200">
    <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-5 sm:p-7 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950">原創 IP</span>
        <h2 className="text-lg sm:text-xl font-black text-stone-900">原創 IP 與 Agent</h2>
      </div>
      <p className="mt-2 text-sm text-stone-600 leading-relaxed">每個 Agent 都有自己的角色和工作範圍。</p>
      <p className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/80 border border-amber-200 px-3 py-2 text-sm font-bold text-amber-800">
        <Sparkles className="w-4 h-4 text-amber-500" />
        角色們都去工作了，快去網站尋找他們吧！
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {AGENTS.map((a) => (
        <article key={a.name} className={`rounded-3xl border bg-gradient-to-b ${a.accent} p-5 flex flex-col gap-3 shadow-2xs`}>
          <div className="h-40 flex items-end justify-center">
            {a.img && <img src={a.img} alt={a.name} loading="lazy" className="max-h-40 w-auto object-contain drop-shadow-sm" />}
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-black text-stone-900">{a.name}</h3>
              <div className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-stone-700">
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                {a.title}
              </div>
            </div>
            {a.idCard && (
              <button
                type="button"
                onClick={() => setViewing(a)}
                title="看身分證"
                aria-label={`放大看${a.name}的創點國身分證`}
                className="group relative shrink-0 -mt-1 rounded-lg ring-1 ring-black/10 bg-white shadow-sm overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md hover:-rotate-2 cursor-zoom-in"
              >
                <img src={a.idCard.thumb} alt="" loading="lazy" width={96} height={64} className="block w-24 h-16 object-cover" />
                <span className="absolute bottom-0.5 right-0.5 inline-flex items-center gap-0.5 rounded-md bg-stone-900/70 px-1 py-px text-[9px] font-bold text-white">
                  <IdCard className="w-2.5 h-2.5" />身分證
                </span>
              </button>
            )}
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">{a.intro}</p>
          <ul className="text-xs text-stone-700 space-y-1">
            {a.duties.map((d) => (
              <li key={d} className="flex gap-1.5"><span className="text-amber-500">•</span>{d}</li>
            ))}
          </ul>
          <div className="mt-auto pt-2 border-t border-black/5">
            <div className="text-[11px] font-bold text-stone-500 flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" />出沒地點</div>
            <div className="flex flex-wrap gap-1">
              {a.spots.map((s) => (
                <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-white/80 border border-black/5 text-stone-700">{s}</span>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>

    <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6">
      <h3 className="text-sm font-black text-stone-900 flex items-center gap-1.5"><Clock className="w-4 h-4 text-stone-500" />其他 Agent（角色設計中，未來會有 IP）</h3>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {UPCOMING.map((a) => (
          <div key={a.name} className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 flex gap-3">
            <div className="w-14 h-14 rounded-2xl bg-stone-200/80 flex items-center justify-center text-2xl font-black text-stone-400 shrink-0">?</div>
            <div>
              <div className="text-sm font-black text-stone-900">{a.name}</div>
              <div className="text-xs font-bold text-stone-600">{a.title}</div>
              <div className="mt-1 text-[11px] text-stone-500">{a.duties.join('、')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
    {viewing && <IdCardViewer agent={viewing} onClose={() => setViewing(null)} />}
  </div>
  );
};

export default AgentsIntroSection;
