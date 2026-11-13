/**
 * 簡體顯示：把畫面上的繁體字即時轉成簡體（含台灣→大陸用詞，例如 軟體→软件、網路→网络）。
 * 只轉換「顯示出來的文字」與 placeholder／title 等屬性，不改動輸入框裡使用者正在打的內容，
 * 也不改動資料庫內容。標上 data-no-convert 的區塊（例如語言選單本身）會略過。
 */
import { Converter } from 'opencc-js/t2cn';

const toSimplified: (s: string) => string = Converter({ from: 'twp', to: 'cn' });
const HAN = /[㐀-鿿]/;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'CODE', 'PRE']);
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

const cache = new Map<string, string>();
function convert(s: string): string {
  const hit = cache.get(s);
  if (hit !== undefined) return hit;
  const out = toSimplified(s);
  if (cache.size > 20000) cache.clear();
  cache.set(s, out);
  return out;
}

function isSkipped(el: Element | null): boolean {
  for (let n: Element | null = el; n; n = n.parentElement) {
    if (SKIP_TAGS.has(n.tagName)) return true;
    if ((n as HTMLElement).isContentEditable) return true;
    if (n.hasAttribute('data-no-convert')) return true;
  }
  return false;
}

function convertTextNode(node: Text) {
  const v = node.nodeValue;
  if (!v || !HAN.test(v)) return;
  if (isSkipped(node.parentElement)) return;
  const out = convert(v);
  if (out !== v) node.nodeValue = out;
}

function convertAttrs(el: Element) {
  if (isSkipped(el)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v && HAN.test(v)) {
      const out = convert(v);
      if (out !== v) el.setAttribute(a, out);
    }
  }
  if (el instanceof HTMLInputElement && (el.type === 'button' || el.type === 'submit') && HAN.test(el.value)) {
    el.value = convert(el.value);
  }
}

function convertTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) { convertTextNode(root as Text); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (isSkipped(el)) return;
  convertAttrs(el);
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n: Node | null = walker.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) convertTextNode(n as Text);
    else convertAttrs(n as Element);
    n = walker.nextNode();
  }
}

let started = false;
const pending = new Set<Node>();
let scheduled = false;
function flush() {
  scheduled = false;
  const nodes = Array.from(pending);
  pending.clear();
  nodes.forEach((n) => { if (n.isConnected) convertTree(n); });
  if (HAN.test(document.title)) {
    const t = convert(document.title);
    if (t !== document.title) document.title = t;
  }
}
function queue(n: Node) {
  pending.add(n);
  if (!scheduled) { scheduled = true; requestAnimationFrame(flush); }
}

/** 給程式直接使用（例如畫在 3D 畫布上的文字、alert 訊息） */
export function toSiteText(s: string): string {
  return started && s && HAN.test(s) ? convert(s) : s;
}

export async function startSimplifiedConversion() {
  if (started) return;
  started = true;
  (window as any).__ideaxToSimplified = convert;
  convertTree(document.body);
  flush();
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') queue(r.target);
      else if (r.type === 'attributes') queue(r.target);
      else r.addedNodes.forEach((n) => queue(n));
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  // 原生 alert／confirm 也顯示簡體
  const { alert: a, confirm: c } = window;
  window.alert = (msg?: any) => a.call(window, typeof msg === 'string' ? convert(msg) : msg);
  window.confirm = (msg?: string) => c.call(window, typeof msg === 'string' ? convert(msg) : msg);
}
