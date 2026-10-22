import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, MapPin, Briefcase, Clock, X, IdCard, Download, Loader2 } from 'lucide-react';

/**
 * 關於 IdeaX →「原創 IP 與 Agent」：介紹站上各個 Agent 角色的名字、職位與負責的業務。
 * 角色們平常都在網站各處工作，這頁只放介紹與「出沒地點」。
 */
type Agent = {
  name: string;
  title: string;
  /** 職稱下方的一行補充（例如 007 的三件法寶） */
  tagline?: string;
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
    intro: '天生領袖氣質，是團隊的主心骨，當燈泡亮起就是又有 idea 了！💡 也是 IdeaX 的站內嚮導。聽懂你想問什麼，再把問題轉給最適合的助理處理。',
    duties: ['站內導覽與功能說明', '聽懂需求、分派給合適的 Agent', '客服問題的第一線接待'],
    spots: ['全站右下角'],
    accent: 'from-amber-100 to-yellow-50 border-amber-200',
  },
  {
    name: '搜搜',
    title: '探索者 Agent、偵查與傳令',
    img: '/agents/sousou.webp',
    idCard: { thumb: '/agents/idcard-sousou-thumb.webp', full: '/agents/idcard-sousou.webp' },
    intro: '話不多，執行效率超高，接到任務瞬間飛到九霄雲天之外～會幫你整理求職條件，帶你前往各大求職平台搜尋最新職缺。',
    duties: ['整理正職、兼職與國外求職條件', '依條件提供各求職平台搜尋入口', '提醒你在來源網站確認職缺內容與招募狀態'],
    spots: ['匯職缺頁左下角'],
    accent: 'from-blue-100 to-sky-50 border-blue-200',
  },
  {
    name: '白喵',
    title: '市場顧問 Agent',
    img: '/agents/baimiao.webp',
    idCard: { thumb: '/agents/idcard-baimiao-thumb.webp', full: '/agents/idcard-baimiao.webp' },
    intro: '哈基米！一隻不會被好奇心害死的貓，除了到處聽八卦，就是呼呼大睡～剛被 IdeaX 聘為市場顧問，負責分析報告、找專家、獵人頭、貼標籤，偶爾還會被 call 去當和事佬。',
    duties: ['題目自動分類與貼標籤', '智慧獵頭、專家媒合', '付費深度分析報告', '交易爭議調解（和事佬）'],
    spots: ['首頁主題專區上方', '提案編輯頁', '付費獵頭', '付費分析報告', '聊天室調解'],
    accent: 'from-yellow-100 to-orange-50 border-yellow-200',
  },
  {
    name: '頂多慧（多慧）',
    title: '官方客服 Agent',
    img: '/agents/duohui.webp?v=2',
    idCard: { thumb: '/agents/idcard-duohui-thumb.webp', full: '/agents/idcard-duohui.webp' },
    intro: '精靈族的貓頭鷹，看起來聰明、喜歡與不同的人交流。IdeaX 的 25hr 官方客服（超時工作中…），有任何問題都可以來找多慧！',
    duties: ['回答站上各種問題、操作引導', '點數託管與驗收撥款說明', '交付爭議與退款政策', '會員方案與認證流程'],
    spots: ['客服視窗', '儲值與會員方案', '點數 & 收支', '我的案件（驗收）'],
    accent: 'from-emerald-100 to-green-50 border-emerald-200',
  },
  {
    name: '007',
    title: 'AI CRM Agent',
    tagline: '雷達・軍師・私人特助',
    img: '/agents/agent007.webp',
    idCard: { thumb: '/agents/idcard-agent007-thumb.webp', full: '/agents/idcard-agent007.webp' },
    intro: '人機族的 AI CRM Agent，集雷達、軍師、特助三件法寶於一身：可以探測客戶動態、謀定策略、管理任務。',
    duties: ['雷達：案件巡航、掃描市場與潛在機會', '軍師：客群與成案意向分析、提供策略', '特助：任務管理、建議最佳跟進時機'],
    spots: ['AI-CRM 功能頁', '小燈泡轉介'],
    accent: 'from-violet-100 to-purple-50 border-violet-200',
  },
];

// 預備角色：還沒分派任務、名字和身分證
const RESERVE = {
  img: '/agents/bear.webp',
  intro: '創點國的神秘成員。個子高大、有點憨厚，擅長幫人把想法落地，懂很多技術。',
};

// 點小圖放大看身分證；Esc 或點背景關閉
type Viewing = { src: string; alt: string; wide?: boolean; /** 有值就顯示「儲存為明信片」，下載用的檔名（不含副檔名） */ saveAs?: string };

/** 把圖片轉成 PNG 存到使用者裝置（PNG 在手機相簿、電腦都打得開） */
async function savePostcard(src: string, name: string) {
  const blob = await fetch(src).then((r) => r.blob());
  let out: Blob = blob;
  try {
    const bmp = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width; canvas.height = bmp.height;
    canvas.getContext('2d')!.drawImage(bmp, 0, 0);
    out = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b || blob), 'image/png'));
  } catch {}
  const ext = out.type === 'image/png' ? 'png' : 'webp';
  const url = URL.createObjectURL(out);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const ImageViewer: React.FC<{ item: Viewing; onClose: () => void }> = ({ item, onClose }) => {
  const [saving, setSaving] = useState<'idle' | 'saving' | 'done'>('idle');
  const save = async () => {
    if (!item.saveAs || saving === 'saving') return;
    setSaving('saving');
    try { await savePostcard(item.src, item.saveAs); setSaving('done'); window.setTimeout(() => setSaving('idle'), 2500); }
    catch { setSaving('idle'); window.open(item.src, '_blank', 'noopener'); } // 下載失敗就直接開圖片，讓使用者長按儲存
  };
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
      aria-label={item.alt}
      onClick={onClose}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className={`relative w-full ${item.wide ? 'max-w-3xl' : 'max-w-[min(90vh,48rem)]'}`} onClick={(e) => e.stopPropagation()}>
        <img src={item.src} alt={item.alt} className={`w-full h-auto ${item.saveAs ? 'max-h-[78vh]' : 'max-h-[88vh]'} object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200`} />
        {item.saveAs && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={save}
              disabled={saving === 'saving'}
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 hover:bg-amber-300 disabled:opacity-70 px-5 py-2.5 text-sm font-black text-stone-950 shadow-lg cursor-pointer active:scale-95 transition-all"
            >
              {saving === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {saving === 'done' ? '已儲存！' : '儲存為明信片'}
            </button>
          </div>
        )}
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
  const [viewing, setViewing] = useState<Viewing | null>(null);
  return (
  <div className="space-y-6 animate-in fade-in duration-200">
    <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-5 sm:p-7 shadow-xs grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-5 md:gap-8 items-center">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950">原創 IP</span>
          <h2 className="text-lg sm:text-xl font-black text-stone-900">原創 IP 與 Agent</h2>
        </div>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed">每個 Agent 都有自己的角色和工作範圍。一群可靠的夥伴，守護你的創意路！</p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/80 border border-amber-200 px-3 py-2 text-sm font-bold text-amber-800">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          角色們都去工作了，快去網站尋找他們吧！
        </p>
      </div>
      <button
        type="button"
        onClick={() => setViewing({ src: '/agents/group.webp?v=2', alt: 'IdeaX 創點子角色群像', wide: true, saveAs: 'IdeaX創點子-角色群像' })}
        aria-label="放大看角色群像"
        className="relative block w-full overflow-hidden rounded-2xl ring-1 ring-amber-200/80 shadow-sm cursor-zoom-in group"
      >
        <img src="/agents/group-900.webp?v=2" alt="IdeaX 創點子角色群像：一群可靠的夥伴，守護你的創意路！" loading="lazy" width={900} height={600}
          className="block w-full h-auto aspect-[3/2] object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
        <span className="absolute bottom-2 right-2 rounded-lg bg-stone-900/70 px-2 py-0.5 text-[11px] font-bold text-white">點一下放大</span>
      </button>
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
              <div className="mt-0.5 flex items-start gap-1 text-xs font-bold text-stone-700 leading-snug">
                <Briefcase className="w-3.5 h-3.5 shrink-0 mt-px" />
                {/* 長職稱只在「、」或「（」換行，不要從字中間斷開 */}
                <span>{a.title.split(/(?<=、)|(?=（)/).map((part) => <span key={part} className="inline-block">{part}</span>)}</span>
              </div>
            </div>
            {a.idCard && (
              <button
                type="button"
                onClick={() => setViewing({ src: a.idCard!.full, alt: `${a.name}的創點國身分證`, wide: true, saveAs: `創點國身分證-${a.name.replace(/[（(].*?[)）]/g, '').trim()}` })}
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
          {a.tagline && <div className="-mt-1 text-[11px] font-black tracking-wide text-violet-700">{a.tagline}</div>}
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

    <div className="rounded-3xl border border-dashed border-stone-300 bg-gradient-to-br from-stone-50 to-red-50/40 p-5 sm:p-6">
      <h3 className="text-sm font-black text-stone-900 flex items-center gap-1.5"><Clock className="w-4 h-4 text-stone-500" />預備角色（待命中，尚未分派任務）</h3>
      <div className="mt-3 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <img src={RESERVE.img} alt="預備角色：創點國的神秘成員" loading="lazy" className="h-44 w-auto object-contain drop-shadow-sm shrink-0" />
        <div className="text-center sm:text-left">
          <div className="text-base font-black text-stone-900">？？？</div>
          <div className="mt-0.5 text-xs font-bold text-stone-500">名字與職位即將公布</div>
          <p className="mt-2 text-sm text-stone-600 leading-relaxed">{RESERVE.intro}</p>
        </div>
      </div>
    </div>
    {viewing && <ImageViewer item={viewing} onClose={() => setViewing(null)} />}
  </div>
  );
};

export default AgentsIntroSection;
