import React, { useEffect, useRef, useState } from 'react';
import { BaiMiao, BaiMiaoAction, BaiMiaoBubble } from './BaiMiao';

/**
 * 提案編輯頁的白喵：在表單的各個字卡（欄位區塊）之間跳來跳去，停在字卡左右邊緣陪你寫。
 * - 只會跳到畫面上看得到的字卡；捲動後目前的字卡看不到了，就跳到看得到的那張
 * - status：有任務時（送出、上傳、整理圖片…）顯示「白喵正在…」
 * 放在一個 position: relative 的外框裡，cardsSelector 指向字卡們（相對於外框）。
 */
const TIPS = [
  '白喵陪你寫提案～',
  '標題短短的、一眼看懂最好！',
  '記得寫清楚想解決的痛點喔',
  '附上圖片或簡報，加分不少～',
  '寫累了就先存草稿吧！',
];

type Props = {
  cardsSelector: string;
  status?: string | null;
};

export const BaiMiaoCardHopper: React.FC<Props> = ({ cardsSelector, status }) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 54 : 72));
  const [action, setAction] = useState<BaiMiaoAction>('idle');
  const [facing, setFacing] = useState(1);
  const [tip, setTip] = useState<string | null>(null);
  // 白喵太靠近外框上緣時，訊息框改放旁邊（不然會被切掉）
  const [nearTop, setNearTop] = useState(false);
  const S = useRef({ x: 0, y: 0, idx: -1, side: 1, hopping: false, placed: false });
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const layer = layerRef.current, cat = catRef.current;
    if (!layer || !cat) return;
    const host = layer.parentElement as HTMLElement;
    let raf = 0;
    const timers: number[] = [];

    const cards = () => Array.from(host.querySelectorAll(cardsSelector)).filter((el) => el !== layer && !el.contains(layer) && (el as HTMLElement).offsetHeight > 44 && getComputedStyle(el).position !== 'absolute') as HTMLElement[];
    const visible = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return r.top > 70 && r.top < window.innerHeight - 90; };
    // 字卡左右邊緣、坐在字卡上緣
    const spotFor = (el: HTMLElement, side: number) => {
      const h = host.getBoundingClientRect(), r = el.getBoundingClientRect(), sz = cat.offsetWidth;
      // 外框會捲動（例如彈出視窗裡的表單）時，超出邊界會被切掉：改停在字卡內側，並加上捲動距離
      const scrolls = /(auto|scroll|hidden)/.test(getComputedStyle(host).overflowY);
      const inside = scrolls || h.width < 640;
      const x = (side > 0 ? r.right - h.left - sz * (inside ? 0.9 : 0.4) : r.left - h.left - sz * (inside ? 0.1 : 0.6)) + host.scrollLeft;
      const y = r.top - h.top - sz * 0.9 + host.scrollTop;
      return { x, y: scrolls ? Math.max(0, y) : y };
    };
    const place = () => {
      cat.style.transform = `translate3d(${Math.round(S.current.x)}px, ${Math.round(S.current.y)}px, 0)`;
      const top = S.current.y - host.scrollTop < 60;
      setNearTop((prev) => (prev === top ? prev : top));
    };

    const hopTo = (i: number, list: HTMLElement[]) => {
      const st = S.current;
      st.side = st.idx < 0 ? 1 : -st.side;
      const to = spotFor(list[i], st.side);
      st.idx = i;
      if (!st.placed || reduceMotion) { st.x = to.x; st.y = to.y; st.placed = true; place(); return; }
      const from = { x: st.x, y: st.y }, dur = 0.75, t0 = performance.now();
      st.hopping = true; setAction('hop'); setFacing(to.x >= from.x ? 1 : -1);
      const arc = Math.min(120, 50 + Math.abs(to.y - from.y) * 0.25);
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / 1000 / dur), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        st.x = from.x + (to.x - from.x) * e; st.y = from.y + (to.y - from.y) * e - Math.sin(p * Math.PI) * arc;
        place();
        if (p < 1) raf = requestAnimationFrame(step);
        else { st.hopping = false; setAction('idle'); }
      };
      raf = requestAnimationFrame(step);
    };

    // 每隔一段時間換一張字卡；目前那張看不到了就馬上換
    const tick = () => {
      const st = S.current, list = cards();
      if (!list.length || st.hopping) return;
      const vis = list.map((el, i) => (visible(el) ? i : -1)).filter((i) => i >= 0);
      if (!vis.length) return;
      const cur = st.idx >= 0 && list[st.idx] && visible(list[st.idx]);
      const next = vis.find((i) => i > st.idx) ?? vis[0];
      if (!cur || next !== st.idx) hopTo(next, list);
    };
    // 字卡位置會因為輸入內容改變，停著的時候也跟著貼齊
    const follow = () => {
      const st = S.current, list = cards();
      if (!st.hopping && st.idx >= 0 && list[st.idx]) { const p = spotFor(list[st.idx], st.side); st.x = p.x; st.y = p.y; place(); }
    };
    let lastHop = 0;
    const loop = window.setInterval(() => {
      const st = S.current, list = cards();
      const cur = st.idx >= 0 && list[st.idx] && visible(list[st.idx]);
      if (!cur || Date.now() - lastHop > 6500) { lastHop = Date.now(); tick(); }
      else follow();
    }, 700);
    timers.push(window.setTimeout(() => { lastHop = Date.now(); tick(); }, 400));
    const onResize = () => { setSize(window.innerWidth < 640 ? 54 : 72); follow(); };
    window.addEventListener('resize', onResize);
    // 偶爾說句提醒
    const tipLoop = window.setInterval(() => {
      setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
      timers.push(window.setTimeout(() => setTip(null), 4500));
    }, 22000);
    timers.push(window.setTimeout(() => { setTip(TIPS[0]); timers.push(window.setTimeout(() => setTip(null), 4000)); }, 1500));
    return () => {
      cancelAnimationFrame(raf); window.clearInterval(loop); window.clearInterval(tipLoop);
      timers.forEach((t) => window.clearTimeout(t)); window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsSelector]);

  const bubble: BaiMiaoBubble | null = status ? { text: status, busy: true } : tip ? { text: tip } : null;
  return (
    <div ref={layerRef} className="pointer-events-none absolute inset-0 z-20" aria-hidden={!bubble}>
      <div ref={catRef} className="absolute left-0 top-0 will-change-transform" style={{ width: size, height: size, transform: 'translate3d(-999px,-999px,0)' }}>
        <BaiMiao
          action={status ? 'idle' : action}
          facing={facing}
          size={size}
          bubble={bubble}
          bubbleSide={nearTop ? (S.current.side > 0 ? 'left' : 'right') : 'top'}
          bubbleAlign={S.current.side > 0 ? 'end' : 'start'}
        />
      </div>
    </div>
  );
};

export default BaiMiaoCardHopper;
