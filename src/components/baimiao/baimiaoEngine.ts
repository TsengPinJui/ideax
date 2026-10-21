// 市場顧問「白喵」：二次元插畫風（描線＋平塗）的 SVG 角色。
// 身體分成頭、身體、左右手、左右腳、尾巴幾個部件，每個動作是一組部件位置；切換動作時平滑過渡，
// 每一幀再疊上呼吸、走路、揮手等小動作。表情畫在頭部的臉群組裡。

export const BAIMIAO_ACTIONS = ['idle', 'walk', 'run', 'hi', 'hop', 'play', 'angry', 'binoculars', 'mediate', 'inspect', 'doze', 'sleep', 'cheer'] as const;
export type BaiMiaoActionName = (typeof BAIMIAO_ACTIONS)[number];
export const BAIMIAO_EXPRESSIONS = ['happy', 'grin', 'smile', 'focused', 'surprised', 'wink', 'asleep', 'angry'] as const;

const INK = '#4a3a30';
const FUR = '#fffdf8';
const SHADE = '#f6eee4';
const YEL = '#f7c63f';
const YEL_D = '#e2a51f';
const PINK = '#f59aa5';
const NAVY = '#2d3552';
const GOLD = '#d7a02c';

type T = { x: number; y: number; r: number; sx: number; sy: number };
type PartName = 'body' | 'head' | 'armR' | 'armL' | 'legR' | 'legL' | 'tail' | 'note';
type Props = { binoculars?: boolean; glasses?: boolean; note?: boolean; pencil?: boolean; magnifier?: boolean };
type Pose = Partial<Record<PartName, Partial<T>>> & {
  order?: PartName[];
  armLenR?: number; armLenL?: number;
  padsR?: boolean; padsL?: boolean; footPadsR?: boolean; footPadsL?: boolean;
  props?: Props;
  z?: number;
  noScarf?: boolean;
};

// 部件的基本位置（站姿，畫布 200×200，地面在 y≈192）
// 角色面向使用者時，牠的右手在畫面左邊：armR = 角色右手（畫面左），armL = 角色左手（畫面右）。
const BASE: Record<PartName, T> = {
  body: { x: 100, y: 150, r: 0, sx: 1, sy: 1 },
  head: { x: 100, y: 88, r: 0, sx: 1, sy: 1 },
  armR: { x: 70, y: 132, r: 18, sx: 1, sy: 1 },
  armL: { x: 130, y: 132, r: -18, sx: 1, sy: 1 },
  legR: { x: 84, y: 174, r: 0, sx: 1, sy: 1 },
  legL: { x: 116, y: 174, r: 0, sx: 1, sy: 1 },
  tail: { x: 126, y: 166, r: 0, sx: 1, sy: 1 },
  note: { x: 100, y: 166, r: 0, sx: 1, sy: 1 },
};
const PART_NAMES = Object.keys(BASE) as PartName[];
const STAND_ORDER: PartName[] = ['tail', 'body', 'legR', 'legL', 'note', 'head', 'armR', 'armL'];

const POSES: Record<string, Pose> = {
  idle: {},
  walk: {},
  run: {},
  hop: {},
  // 拍毛線球：身體前傾、兩隻前腳輪流往前撥
  play: { body: { r: 8 }, head: { x: 108, y: 92, r: 6 }, armR: { x: 74, r: -40 }, armL: { x: 128, r: -60 }, padsR: true, padsL: true },
  // 生氣：雙手握拳舉高、跺腳
  angry: { body: { sy: 1.03 }, head: { y: 86 }, armR: { x: 66, y: 126, r: 128 }, armL: { x: 134, y: 126, r: -128 }, armLenR: 0.9, armLenL: 0.9, padsR: true, padsL: true },
  cheer: { armR: { r: 150 }, armL: { r: -150 }, padsR: true, padsL: true },
  // 面向使用者：右腳著地、左腳離地往外抬；右手（畫面左）高舉揮手，左手（畫面右）平舉保持平衡
  hi: {
    body: { r: -6 }, head: { x: 98, r: -8 },
    armR: { x: 68, y: 128, r: 142 }, armL: { x: 132, y: 130, r: -96 }, armLenR: 1.35,
    legR: { x: 86, r: 4 }, legL: { x: 122, y: 166, r: -42 }, footPadsL: true, padsR: true,
  },
  // 雙手扶著望遠鏡往遠處看
  binoculars: {
    head: { y: 86 }, armR: { x: 72, y: 128, r: 168 }, armL: { x: 128, y: 128, r: -168 },
    armLenR: 1.25, armLenL: 1.25, props: { binoculars: true },
  },
  // 坐下、戴眼鏡，拿紙筆寫
  mediate: {
    body: { y: 160, sx: 1.06, sy: 0.9 }, head: { y: 100 },
    legR: { x: 80, y: 182, r: 10 }, legL: { x: 120, y: 182, r: -10 }, footPadsR: true, footPadsL: true,
    armR: { x: 72, y: 142, r: -32 }, armL: { x: 128, y: 142, r: 40 },
    note: { x: 104, y: 166, r: -8 }, order: ['tail', 'body', 'legR', 'legL', 'head', 'note', 'armR', 'armL'],
    props: { glasses: true, note: true, pencil: true },
  },
  // 趴在地上：頭在前、身體在後面拱起來、腳翹在空中，一手撐地、一手拿放大鏡
  inspect: {
    body: { x: 126, y: 158, sx: 1.18, sy: 0.78 }, head: { x: 84, y: 132, r: -6 },
    legR: { x: 152, y: 140, r: -150 }, legL: { x: 162, y: 146, r: -128 }, footPadsR: true, footPadsL: true,
    tail: { x: 150, y: 150, r: -20 },
    armR: { x: 66, y: 168, r: 6 }, armL: { x: 104, y: 166, r: 150 }, armLenL: 1.15,
    order: ['tail', 'legR', 'legL', 'body', 'armR', 'head', 'armL'], props: { magnifier: true },
  },
  // 側躺撐著頭打瞌睡
  doze: {
    body: { x: 122, y: 168, r: -6, sx: 1.22, sy: 0.82 }, head: { x: 74, y: 138, r: -22 },
    armR: { x: 78, y: 176, r: 160 }, armLenR: 1.1, armL: { x: 116, y: 150, r: -70 },
    legR: { x: 160, y: 176, r: -86 }, legL: { x: 162, y: 168, r: -100 }, footPadsR: true,
    tail: { x: 158, y: 164, r: 10 },
    order: ['tail', 'legL', 'body', 'legR', 'armR', 'head', 'armL'], z: 1,
  },
  // 躺平呼呼大睡：趴在地上、下巴貼地、手收在前面
  sleep: {
    body: { x: 124, y: 172, sx: 1.3, sy: 0.7 }, head: { x: 80, y: 150, r: -4 },
    armR: { x: 58, y: 190, r: 70, sy: 0.7 }, armL: { x: 104, y: 192, r: -70, sy: 0.7 },
    legR: { x: 162, y: 180, r: -88 }, legL: { x: 168, y: 186, r: -92 }, footPadsR: true, footPadsL: true,
    tail: { x: 166, y: 172, r: 30 },
    order: ['tail', 'legL', 'legR', 'body', 'head', 'armR', 'armL'], z: 2, noScarf: true,
  },
};

const EXPR_OF: Record<string, string> = { idle: 'happy', walk: 'happy', run: 'focused', play: 'grin', angry: 'angry', hi: 'grin', hop: 'happy', cheer: 'grin', binoculars: 'focused', mediate: 'focused', inspect: 'focused', doze: 'asleep', sleep: 'asleep' };

const svgNS = 'http://www.w3.org/2000/svg';

const HEAD_PATH =
  'M0 -44 C 32 -44 56 -27 56 -1 C 56 9 54 16 50 22 L 59 26 L 49 30 L 55 36 L 41 39 C 31 45 17 48 0 48 C -17 48 -31 45 -41 39 L -55 36 L -49 30 L -59 26 L -50 22 C -54 16 -56 9 -56 -1 C -56 -27 -32 -44 0 -44 Z';

function earPath(s: number) {
  return `M${-50 * s} -16 C ${-56 * s} -42 ${-52 * s} -62 ${-44 * s} -70 C ${-34 * s} -62 ${-24 * s} -50 ${-14 * s} -40 Z`;
}
function earMarkup(uid: string, s: number) {
  return `<g data-ear="${s}">
    <path d="${earPath(s)}" fill="${FUR}"/>
    <g clip-path="url(#${uid}ear${s})"><rect x="-70" y="-80" width="140" height="26" fill="${YEL}"/></g>
    <path d="M${-44 * s} -24 C ${-47 * s} -40 ${-45 * s} -52 ${-42 * s} -58 C ${-35 * s} -50 ${-29 * s} -42 ${-23 * s} -36 Z" fill="#f9c99c"/>
    <path d="${earPath(s)}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
  </g>`;
}
function armMarkup(name: string, withTools: boolean) {
  return `<g data-p="${name}"><g data-len>
    <path d="M-8.5 -2 L-8.5 20 A 8.5 8.5 0 0 0 8.5 20 L 8.5 -2" fill="${FUR}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
  </g>
  <g data-paw>
    <circle cx="0" cy="0" r="9.5" fill="${FUR}" stroke="${INK}" stroke-width="2.4"/>
    <g data-pads fill="${PINK}"><ellipse cx="0" cy="2" rx="3.6" ry="2.8"/><circle cx="-4" cy="-3" r="1.5"/><circle cx="0" cy="-4.6" r="1.5"/><circle cx="4" cy="-3" r="1.5"/></g>
    ${withTools ? `<g data-prop="pencil" transform="translate(2 -2) rotate(28)">
      <rect x="-2.6" y="-26" width="5.2" height="24" rx="1" fill="${YEL}" stroke="${INK}" stroke-width="1.6"/>
      <path d="M-2.6 -2 L0 5 L2.6 -2 Z" fill="#f2d3a6" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
      <rect x="-2.6" y="-30" width="5.2" height="4" rx="1" fill="#f3a3b6" stroke="${INK}" stroke-width="1.4"/>
    </g>
    <g data-prop="magnifier" transform="rotate(-20)">
      <rect x="-3" y="-6" width="6" height="22" rx="2.5" fill="#a8723f" stroke="${INK}" stroke-width="1.6"/>
      <circle cx="0" cy="-24" r="16" fill="rgba(200,228,255,0.45)" stroke="${GOLD}" stroke-width="4.2"/>
      <circle cx="0" cy="-24" r="18.2" fill="none" stroke="${INK}" stroke-width="1.4"/>
      <path d="M-8 -31 a 9 9 0 0 1 8 -4" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    </g>` : ''}
  </g></g>`;
}
function legMarkup(name: string) {
  return `<g data-p="${name}">
    <ellipse cx="0" cy="8" rx="13" ry="10" fill="${FUR}" stroke="${INK}" stroke-width="2.4"/>
    <g data-pads fill="${PINK}"><ellipse cx="0" cy="11" rx="4.4" ry="3.4"/><circle cx="-5" cy="4.5" r="1.7"/><circle cx="0" cy="3" r="1.7"/><circle cx="5" cy="4.5" r="1.7"/></g>
  </g>`;
}

function partsMarkup(uid: string) {
  const clipEar = (s: number) => `<clipPath id="${uid}ear${s}"><path d="${earPath(s)}"/></clipPath>`;
  const tailD = 'M0 0 C 20 0 34 -16 32 -38 C 30 -56 38 -66 48 -64';
  return `
<defs>${clipEar(1)}${clipEar(-1)}
  <clipPath id="${uid}headclip"><path d="${HEAD_PATH}"/></clipPath>
  <clipPath id="${uid}bodyclip"><ellipse cx="0" cy="0" rx="40" ry="36"/></clipPath>
</defs>
<g data-p="tail">
  <path d="${tailD}" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
  <path d="${tailD}" fill="none" stroke="${FUR}" stroke-width="8.4" stroke-linecap="round"/>
  <path d="M34 -56 C 34 -66 41 -72 49 -69 C 57 -66 57 -56 51 -52 C 45 -48 35 -49 34 -56 Z" fill="${YEL}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
</g>
<g data-p="body">
  <ellipse cx="0" cy="0" rx="40" ry="36" fill="${FUR}"/>
  <g clip-path="url(#${uid}bodyclip)"><ellipse cx="6" cy="30" rx="44" ry="16" fill="${SHADE}"/></g>
  <ellipse cx="0" cy="0" rx="40" ry="36" fill="none" stroke="${INK}" stroke-width="2.6"/>
</g>
${legMarkup('legR')}${legMarkup('legL')}
<g data-p="note">
  <g transform="translate(-22 -14)">
    <rect x="0" y="0" width="44" height="30" rx="3" fill="${YEL}" stroke="${INK}" stroke-width="2.2"/>
    <rect x="3" y="3" width="38" height="24" rx="2" fill="#fffef8" stroke="${INK}" stroke-width="1.2"/>
    <path d="M7 10 H35 M7 16 H31 M7 22 H26" stroke="#9fb6dc" stroke-width="1.6" stroke-linecap="round"/>
    <path data-scribble d="M7 10 q 3 -3 6 0 t 6 0 t 6 0 t 6 0 M7 16 q 3 -3 6 0 t 6 0 t 6 0" stroke="#55627e" stroke-width="1.3" fill="none"/>
  </g>
</g>
<g data-p="head">
  ${earMarkup(uid, 1)}${earMarkup(uid, -1)}
  <path d="${HEAD_PATH}" fill="${FUR}"/>
  <g clip-path="url(#${uid}headclip)"><ellipse cx="0" cy="42" rx="52" ry="14" fill="${SHADE}"/></g>
  <path d="${HEAD_PATH}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
  <g data-face></g>
  <g stroke="${INK}" stroke-width="1.4" stroke-linecap="round" fill="none">
    <path d="M44 8 L66 4 M45 13 L68 13 M44 18 L65 22"/><path d="M-44 8 L-66 4 M-45 13 L-68 13 M-44 18 L-65 22"/>
  </g>
  <g data-prop="glasses" stroke="${NAVY}" stroke-width="2.4" fill="rgba(200,225,255,0.28)">
    <circle cx="-22" cy="3" r="13"/><circle cx="22" cy="3" r="13"/><path d="M-9 1 q 9 -6 18 0" fill="none"/>
    <path d="M-35 0 L-50 -4 M35 0 L50 -4" fill="none"/>
    <path d="M-28 -4 l5 -2 M16 -4 l5 -2" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  </g>
  <g data-prop="binoculars">
    <rect x="-8" y="-4" width="16" height="9" rx="2" fill="${GOLD}" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="-15" cy="2" r="14" fill="${NAVY}" stroke="${INK}" stroke-width="2.2"/><circle cx="15" cy="2" r="14" fill="${NAVY}" stroke="${INK}" stroke-width="2.2"/>
    <circle cx="-15" cy="2" r="10" fill="#9fc3ef" stroke="${GOLD}" stroke-width="2.6"/><circle cx="15" cy="2" r="10" fill="#9fc3ef" stroke="${GOLD}" stroke-width="2.6"/>
    <path d="M-20 -3 a 6 6 0 0 1 6 -3 M10 -3 a 6 6 0 0 1 6 -3" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  </g>
  <g data-scarf transform="translate(0 44)">
    <path d="M-42 -4 Q 0 10 42 -4 L 40 7 Q 0 21 -40 7 Z" fill="${YEL}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M-30 2 q 4 3 8 3 M22 5 q 4 0 8 -3" stroke="${YEL_D}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M0 6 L-16 -1 L-14 15 Z M0 6 L16 -1 L14 15 Z" fill="${YEL}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <circle cx="0" cy="6" r="4.6" fill="${YEL_D}" stroke="${INK}" stroke-width="2"/>
    <g transform="translate(0 18)">
      <rect x="-3.6" y="-7" width="7.2" height="5" rx="1.2" fill="${GOLD}" stroke="${INK}" stroke-width="1.6"/>
      <circle cx="0" cy="2.5" r="6.4" fill="#ffd95a" stroke="${INK}" stroke-width="1.8"/>
      <path d="M-2 4 q 2 -4 4 0" stroke="${GOLD}" stroke-width="1.3" fill="none"/>
      <circle cx="-2" cy="0.5" r="1.4" fill="#fff"/>
    </g>
  </g>
</g>
${armMarkup('armR', false)}${armMarkup('armL', true)}
<g data-fx></g>`;
}

export type BaiMiaoEngine = {
  play: (name: string) => void;
  setExpression: (name: string) => void;
  setFacing: (f: number) => void;
  say: (ms?: number) => void;
  getAction: () => string;
  destroy: () => void;
};

export function createBaiMiao(host: HTMLElement, opts: { action?: string; facing?: number; expression?: string } = {}): BaiMiaoEngine {
  const uid = 'bm' + Math.random().toString(36).slice(2, 7);
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.display = 'block';
  svg.style.overflow = 'visible';
  svg.innerHTML = `<g data-root>${partsMarkup(uid)}</g>`;
  host.appendChild(svg);
  const q = <E extends Element = SVGGElement>(sel: string, from: ParentNode = svg) => from.querySelector(sel) as unknown as E;
  const rootG = q('[data-root]');
  const parts = Object.fromEntries(PART_NAMES.map((k) => [k, q(`[data-p="${k}"]`)])) as Record<PartName, SVGGElement>;
  const face = q('[data-face]');
  const fxG = q('[data-fx]');
  const props = {
    glasses: q('[data-prop="glasses"]'), binoculars: q('[data-prop="binoculars"]'),
    pencil: q('[data-prop="pencil"]'), magnifier: q('[data-prop="magnifier"]'),
  };
  const scribble = q<SVGPathElement>('[data-scribble]');
  const scarf = q('[data-scarf]');
  const earR = q('[data-ear="1"]');
  const armParts = {
    armR: { len: q('[data-len]', parts.armR), paw: q('[data-paw]', parts.armR), pads: q('[data-pads]', parts.armR) },
    armL: { len: q('[data-len]', parts.armL), paw: q('[data-paw]', parts.armL), pads: q('[data-pads]', parts.armL) },
  };
  const footPads = { legR: q('[data-pads]', parts.legR), legL: q('[data-pads]', parts.legL) };

  // Zzz 與星星
  fxG.innerHTML = [0, 1, 2].map((i) => `<text data-z="${i}" font-family="'Arial Rounded MT Bold', Nunito, Arial, sans-serif" font-weight="900" fill="#7b8db8" stroke="#fff" stroke-width="2.5" paint-order="stroke" opacity="0">Z</text>`).join('')
    + Array.from({ length: 8 }, (_, i) => `<path data-star="${i}" d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" fill="${YEL}" stroke="${INK}" stroke-width="1" opacity="0"/>`).join('');
  const zEls = Array.from(fxG.querySelectorAll('[data-z]')) as SVGTextElement[];
  const starEls = Array.from(fxG.querySelectorAll('[data-star]')) as SVGPathElement[];
  let starT = -1;

  // ── 表情 ──
  let expr = 'happy', blinkT = 0, nextBlink = 2.4, lookX = 0, talk = 0, lastFaceKey = '';
  function faceMarkup(): string {
    const e = expr;
    const closed = blinkT > 0 && (e === 'happy' || e === 'smile' || e === 'focused' || e === 'surprised');
    const lx = lookX * 4;
    const eye = (s: number) => {
      const cx = 22 * s + lx, cy = 3;
      if (closed || e === 'asleep') return `<path d="M${cx - 8} ${cy} q 8 6 16 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
      if (e === 'angry') {
        // 怒目：眉毛往中間壓、眼睛瞇成三角
        return `<path d="M${cx + 10 * s} ${cy - 13} L${cx - 7 * s} ${cy - 6}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
          <path d="M${cx - 7} ${cy - 2} Q ${cx} ${cy + 1} ${cx + 7} ${cy - 2} Q ${cx + 3} ${cy + 7} ${cx} ${cy + 7} Q ${cx - 4} ${cy + 7} ${cx - 7} ${cy - 2} Z" fill="#2a1d18"/>
          <circle cx="${cx - 1.5}" cy="${cy + 1.5}" r="1.4" fill="#fff"/>`;
      }
      if (e === 'grin') return `<path d="M${cx - 7 * s} ${cy - 7} L${cx + 6 * s} ${cy} L${cx - 7 * s} ${cy + 7}" stroke="${INK}" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      if (e === 'wink' && s === 1) return `<path d="M${cx - 8} ${cy + 2} q 8 -7 16 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
      const rx = e === 'surprised' ? 8.5 : e === 'focused' ? 6.8 : 7.6, ry = e === 'surprised' ? 10.5 : e === 'focused' ? 8.4 : 9.6;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#2a1d18"/>
        <ellipse cx="${cx - rx * 0.32}" cy="${cy - ry * 0.4}" rx="${rx * 0.42}" ry="${ry * 0.36}" fill="#fff"/>
        <circle cx="${cx + rx * 0.4}" cy="${cy + ry * 0.42}" r="${rx * 0.18}" fill="#fff"/>`;
    };
    const blush = [1, -1].map((s) => `<ellipse cx="${34 * s + lx}" cy="17" rx="9.5" ry="5.6" fill="#f7a3ad" opacity="0.7"/>
      <path d="M${34 * s + lx - 4} 15 l -2 3 M${34 * s + lx} 15 l -2 3 M${34 * s + lx + 4} 15 l -2 3" stroke="#e98592" stroke-width="1" opacity="0.8"/>`).join('');
    const nx = lx, ny = 13;
    const nose = `<path d="M${nx - 3.4} ${ny - 1.6} L${nx + 3.4} ${ny - 1.6} L${nx} ${ny + 2.4} Z" fill="#f08795" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
    const my = ny + 3.4;
    const open = talk > 0 ? 0.35 + Math.abs(Math.sin(performance.now() / 85)) * 0.65 : 1;
    let mouth: string;
    if (e === 'happy' || e === 'grin' || e === 'wink' || (talk > 0 && e !== 'asleep')) {
      const h = 10 * open + 2;
      mouth = `<path d="M${nx - 8} ${my} Q ${nx - 4} ${my + 2.2} ${nx} ${my} Q ${nx + 4} ${my + 2.2} ${nx + 8} ${my} C ${nx + 8} ${my + h} ${nx - 8} ${my + h} ${nx - 8} ${my} Z" fill="#c23d50" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M${nx - 4.6} ${my + h * 0.72} q 4.6 -${(h * 0.42).toFixed(2)} 9.2 0 q -4.6 ${(h * 0.34).toFixed(2)} -9.2 0 Z" fill="#f58b98"/>`;
    } else if (e === 'angry') {
      // 張嘴大罵：露出小虎牙，額頭冒青筋
      const h = 8 + 6 * open;
      mouth = `<path d="M${nx - 9} ${my + 1} Q ${nx} ${my - 3} ${nx + 9} ${my + 1} Q ${nx + 7} ${my + h} ${nx} ${my + h} Q ${nx - 7} ${my + h} ${nx - 9} ${my + 1} Z" fill="#c23d50" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M${nx - 6} ${my + 0.6} l 1.6 3.6 l 1.6 -3.4 Z M${nx + 6} ${my + 0.6} l -1.6 3.6 l -1.6 -3.4 Z" fill="#fff"/>
        <g transform="translate(${30 + lx} -30)" stroke="#e5484d" stroke-width="2.6" stroke-linecap="round" fill="none">
          <path d="M-7 -2 q 4 -1 5 -5 M2 -7 q 1 4 5 5 M7 2 q -4 1 -5 5 M-2 7 q -1 -4 -5 -5"/>
        </g>`;
    } else if (e === 'surprised') {
      mouth = `<ellipse cx="${nx}" cy="${my + 4}" rx="3.6" ry="4.4" fill="#c23d50" stroke="${INK}" stroke-width="1.6"/>`;
    } else {
      mouth = `<path d="M${nx - 7} ${my - 0.5} q 3.5 4 7 0 q 3.5 4 7 0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    }
    return blush + eye(-1) + eye(1) + nose + mouth;
  }
  function drawFace() {
    const key = `${expr}|${blinkT > 0}|${Math.round(lookX * 10)}|${talk > 0 ? Math.round(performance.now() / 85) : 0}`;
    if (key === lastFaceKey) return;
    lastFaceKey = key;
    face.innerHTML = faceMarkup();
  }

  // ── 動作 ──
  let action = 'idle', actionT = 0, facing = 0;
  const cur = Object.fromEntries(PART_NAMES.map((k) => [k, { ...BASE[k] }])) as Record<PartName, T>;
  const curLen = { armR: 1, armL: 1 };
  let curFacing = 1;
  let order = '';
  const applyOrder = (o: PartName[]) => {
    const key = o.join();
    if (key === order) return;
    order = key;
    for (const k of o) rootG.insertBefore(parts[k], fxG);
  };

  const setExpression = (name: string) => { expr = name; lastFaceKey = ''; drawFace(); };
  const play = (name: string) => {
    if (!(BAIMIAO_ACTIONS as readonly string[]).includes(name) || name === action) return;
    action = name; actionT = 0;
    if (EXPR_OF[name]) setExpression(EXPR_OF[name]);
    if (name === 'hi' || name === 'cheer') starT = 0;
  };
  const setFacing = (f: number) => { facing = Math.max(-1, Math.min(1, f)); };
  const say = (ms = 1600) => { talk = ms / 1000; };

  const tf = (t: T) => `translate(${t.x.toFixed(2)} ${t.y.toFixed(2)}) rotate(${t.r.toFixed(2)}) scale(${t.sx.toFixed(3)} ${t.sy.toFixed(3)})`;
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  const show = (el: Element | null, on: boolean | undefined) => { if (el) (el as SVGElement).style.display = on ? '' : 'none'; };

  let raf = 0, last = performance.now(), destroyed = false;
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frame(now: number) {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    const raw = (now - last) / 1000; last = now;
    const dt = Math.min(0.05, raw);
    actionT += Math.min(0.25, raw); // 動作進度用真實時間，掉幀時步驟也準時發生
    const t = now / 1000, at = actionT, a = action;
    if (a === 'cheer' && at > 1.4) play('idle');
    const P = POSES[a] || {};
    const target = Object.fromEntries(PART_NAMES.map((k) => [k, { ...BASE[k], ...(P[k] || {}) }])) as Record<PartName, T>;
    let lenR = P.armLenR ?? 1, lenL = P.armLenL ?? 1;
    const pr: Props = { ...(P.props || {}) };
    let bob = 0, look = Math.sin(t * 0.6) * 0.5;
    const calm = reduceMotion ? 0.3 : 1;

    // 每一幀疊加的小動作
    if (a === 'idle') {
      bob = Math.sin(t * 2) * 1.2 * calm;
      target.armR.r += Math.sin(t * 2) * 3; target.armL.r -= Math.sin(t * 2) * 3;
      target.head.r += Math.sin(t * 0.9) * 2.5;
    } else if (a === 'walk') {
      const ph = t * 7;
      bob = -Math.abs(Math.sin(ph)) * 4 * calm;
      target.body.r = Math.sin(ph) * 3; target.head.r = Math.sin(ph) * 3;
      target.armR.r += Math.sin(ph) * 28; target.armL.r += Math.sin(ph) * 28;
      target.legR.y -= Math.max(0, Math.sin(ph)) * 7; target.legL.y -= Math.max(0, -Math.sin(ph)) * 7;
      target.legR.r = Math.sin(ph) * 14; target.legL.r = -Math.sin(ph) * 14;
      target.tail.r = 8 + Math.sin(ph) * 6;
      look = 0.8;
    } else if (a === 'run') {
      // 衝刺：步伐快、身體前傾
      const ph = t * 13;
      bob = -Math.abs(Math.sin(ph)) * 6 * calm;
      target.body.r = 8 + Math.sin(ph) * 3; target.head.r = 6 + Math.sin(ph) * 2; target.head.x += 4;
      target.armR.r += Math.sin(ph) * 46; target.armL.r += Math.sin(ph) * 46;
      target.legR.y -= Math.max(0, Math.sin(ph)) * 10; target.legL.y -= Math.max(0, -Math.sin(ph)) * 10;
      target.legR.r = Math.sin(ph) * 26; target.legL.r = -Math.sin(ph) * 26;
      target.tail.r = -14 + Math.sin(ph) * 8;
      look = 1;
    } else if (a === 'play') {
      // 兩隻前腳輪流往前撥
      const ph = at * 9;
      target.armR.r += Math.max(0, Math.sin(ph)) * -50; target.armL.r += Math.max(0, -Math.sin(ph)) * -50;
      target.armR.x += Math.max(0, Math.sin(ph)) * 10; target.armL.x += Math.max(0, -Math.sin(ph)) * 10;
      bob = -Math.abs(Math.sin(ph / 2)) * 3; target.tail.r = 14 + Math.sin(at * 7) * 14; look = 0.8;
    } else if (a === 'angry') {
      // 跺腳、握拳發抖
      const st = Math.sin(at * 16);
      bob = -Math.max(0, st) * 4;
      target.legR.y -= Math.max(0, st) * 6; target.legL.y -= Math.max(0, -st) * 6;
      target.armR.r += Math.sin(at * 22) * 6; target.armL.r -= Math.sin(at * 22) * 6;
      target.head.x += Math.sin(at * 30) * 1.2; target.tail.r = -30 + Math.sin(at * 20) * 6; look = 0;
    } else if (a === 'hi') {
      target.armR.r += Math.sin(at * 10) * 16; target.armL.r += Math.sin(at * 3) * 5;
      bob = -Math.max(0, Math.sin(Math.min(1, at / 0.35) * Math.PI)) * 8;
      target.tail.r = 10 + Math.sin(at * 6) * 8; look = 0;
    } else if (a === 'hop' || a === 'cheer') {
      const c = (at % 0.9) / 0.9, j = Math.sin(c * Math.PI);
      bob = -j * (a === 'cheer' ? 26 : 18);
      target.body.sy = 1 + (c < 0.12 || c > 0.88 ? -0.07 : 0.03); target.body.sx = 2 - target.body.sy;
      target.legR.y -= j * 4; target.legL.y -= j * 4;
      if (a === 'hop') { target.armR.r = 18 + j * 60; target.armL.r = -18 - j * 60; }
      target.tail.r = 10;
    } else if (a === 'binoculars') {
      const sweep = Math.sin(at * 0.8);
      target.head.x += sweep * 3; target.head.r += sweep * 4; look = sweep;
      target.armR.x += sweep * 3; target.armL.x += sweep * 3;
      bob = Math.sin(t * 1.5) * 0.8; target.tail.r = sweep * 10;
    } else if (a === 'mediate') {
      // 坐下 → 右手扶眼鏡戴上 → 拿出紙筆低頭寫字
      if (at > 0.6 && at < 1.4) { target.armR.r = 168; lenR = 1.3; }
      pr.glasses = at > 1.05; pr.note = at > 1.5; pr.pencil = at > 1.5;
      if (at > 1.8) {
        target.head.r = 4 + Math.sin(at * 0.9) * 2; target.head.y += 3; look = -0.2;
        target.armL.r = 40 + Math.sin(at * 7) * 6; target.armL.x += Math.sin(at * 7) * 2;
        scribble?.setAttribute('stroke-dasharray', `${((at - 1.8) * 26) % 90} 200`);
      } else { target.armL.r = -18; scribble?.setAttribute('stroke-dasharray', '0 200'); }
    } else if (a === 'inspect') {
      const sw = Math.sin(at * 0.7);
      target.head.r += sw * 3; look = sw * 0.6;
      target.legR.r += Math.sin(at * 2.4) * 14; target.legL.r -= Math.sin(at * 2.4) * 14;
      target.armL.r += sw * 6; target.tail.r += Math.sin(at * 1.5) * 10;
    } else if (a === 'doze') {
      const nod = Math.pow(Math.max(0, Math.sin(at * 0.9)), 8) * 6;
      target.head.r += nod; target.head.y += nod * 0.6;
      target.body.sy *= 1 + Math.sin(t * 1.6) * 0.02; target.tail.r += Math.sin(t * 0.8) * 4;
    } else if (a === 'sleep') {
      const br = Math.sin(t * 1.4);
      target.body.sy *= 1 + br * 0.035; target.body.sx *= 1 - br * 0.01; target.head.y += br * 0.6;
      target.tail.r += Math.sin(t * 0.5) * 3;
    }

    // 平滑過渡到目標姿勢
    const k = Math.min(1, dt * 9);
    for (const n of PART_NAMES) {
      const c = cur[n], g = target[n];
      c.x = lerp(c.x, g.x, k); c.y = lerp(c.y, g.y, k); c.r = lerp(c.r, g.r, k); c.sx = lerp(c.sx, g.sx, k); c.sy = lerp(c.sy, g.sy, k);
      parts[n].setAttribute('transform', tf(c));
    }
    curLen.armR = lerp(curLen.armR, lenR, k); curLen.armL = lerp(curLen.armL, lenL, k);
    for (const n of ['armR', 'armL'] as const) {
      armParts[n].len.setAttribute('transform', `scale(1 ${curLen[n].toFixed(3)})`);
      armParts[n].paw.setAttribute('transform', `translate(0 ${(22 * curLen[n]).toFixed(2)})`);
    }
    applyOrder(P.order || STAND_ORDER);
    // 往左走時整隻左右翻轉；「嗨」在右端用右手（畫面左邊那隻）揮，左端則左右相反
    curFacing = a === 'walk' || a === 'run' || a === 'play' || a === 'hi' ? (facing >= 0 ? 1 : -1) : 1;
    rootG.setAttribute('transform', `translate(100 ${bob.toFixed(2)}) scale(${curFacing} 1) translate(-100 0)`);
    // 耳朵偶爾抖一下
    const tw = Math.pow(Math.max(0, Math.sin(t * 1.3)), 30) * 10;
    earR.setAttribute('transform', `rotate(${(-tw).toFixed(2)} -30 -40)`);
    // 肉球：手掌朝前、抬腳時看得到
    show(armParts.armR.pads, P.padsR); show(armParts.armL.pads, P.padsL);
    show(footPads.legR, P.footPadsR); show(footPads.legL, P.footPadsL);
    // 道具
    show(props.glasses, pr.glasses); show(props.binoculars, pr.binoculars);
    show(scarf, !P.noScarf);
    show(props.pencil, pr.pencil); show(props.magnifier, pr.magnifier); show(parts.note, pr.note);

    // Zzz（打瞌睡兩個、熟睡三個）
    const zOn = P.z || 0;
    zEls.forEach((el, i) => {
      if (!zOn || i >= (zOn === 1 ? 2 : 3)) { el.setAttribute('opacity', '0'); return; }
      const c = ((t * (zOn === 1 ? 0.35 : 0.5)) + i / 3) % 1;
      const x = cur.head.x + 24 + c * 26, y = cur.head.y - 42 - c * 40;
      el.setAttribute('x', x.toFixed(1)); el.setAttribute('y', y.toFixed(1));
      el.setAttribute('font-size', ((zOn === 1 ? 11 : 14) * (0.6 + c)).toFixed(1));
      el.setAttribute('opacity', Math.sin(c * Math.PI).toFixed(2));
    });
    // 星星
    if (starT >= 0) {
      starT += dt;
      const life = Math.max(0, 1 - starT / 1.1);
      starEls.forEach((el, i) => {
        const ang = Math.PI + (i / (starEls.length - 1)) * Math.PI, d = 64 + starT * 50;
        el.setAttribute('transform', `translate(${(cur.head.x + Math.cos(ang) * d).toFixed(1)} ${(cur.head.y - 10 + Math.sin(ang) * d * 0.7 - starT * 20).toFixed(1)}) scale(${(life * 1.1).toFixed(2)})`);
        el.setAttribute('opacity', life.toFixed(2));
      });
      if (starT > 1.1) starT = -1;
    }

    // 眨眼、說話、視線
    if (blinkT > 0) blinkT -= dt;
    else if ((nextBlink -= dt) <= 0) { blinkT = 0.13; nextBlink = 2.2 + Math.random() * 3; }
    if (talk > 0) talk -= dt;
    lookX = lerp(lookX, look, Math.min(1, dt * 6));
    drawFace();
  }

  setExpression(opts.expression || EXPR_OF[opts.action || 'idle'] || 'happy');
  if (opts.facing) facing = opts.facing;
  play(opts.action || 'idle');
  raf = requestAnimationFrame(frame);

  return {
    play, setExpression, setFacing, say,
    getAction: () => action,
    destroy() { destroyed = true; cancelAnimationFrame(raf); svg.remove(); },
  };
}
