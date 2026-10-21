/**
 * 建置後產生「給搜尋引擎看的」靜態 HTML：
 * 1. 每個主要分頁（/jobs、/explore、/challenge…）一份 dist/seo/<名稱>.html，
 *    標題、描述、canonical、og:url 一開始就是該分頁自己的，Google 不會把它當成首頁的重複頁。
 * 2. dist/app.html：其他網址（/question/:id 等）用的 SPA 外殼，拿掉寫死的首頁 canonical，
 *    交給前端依內容設定，避免和首頁衝突。
 * 3. dist/sitemap.xml：依分頁清單重新產生，日期用建置當天。
 * 分頁資料來源是 src/services/seoService.ts 的 GOOGLE_SITELINKS，改那裡就好。
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const SITE = 'https://www.ideax.tw';

// 需要登入或只是操作流程的頁面，不放進 sitemap
const NOT_IN_SITEMAP = new Set(['topup', 'my_projects', 'vibecoding_publish', 'chat']);

const bundled = await build({
  entryPoints: ['src/services/seoService.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const sitelinks = mod.GOOGLE_SITELINKS;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

function setTag(html, re, replacement, label) {
  if (!re.test(html)) throw new Error(`seo-pages: index.html 找不到 ${label}`);
  return html.replace(re, replacement);
}

function pageHtml(item) {
  const url = `${SITE}${item.path}`;
  let h = shell;
  h = setTag(h, /<title>[^<]*<\/title>/, `<title>${esc(item.title)}</title>`, 'title');
  h = setTag(h, /<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(item.description)}" />`, 'description');
  h = setTag(h, /<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${esc(url)}" />`, 'canonical');
  h = setTag(h, /<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${esc(url)}" />`, 'og:url');
  h = setTag(h, /<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(item.title)}" />`, 'og:title');
  h = setTag(h, /<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(item.description)}" />`, 'og:description');
  h = setTag(h, /<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${esc(item.title)}" />`, 'twitter:title');
  h = setTag(h, /<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${esc(item.description)}" />`, 'twitter:description');
  if (item.image) {
    // 這一頁有自己的分享預覽圖
    const img = `${SITE}${item.image.url}`;
    h = setTag(h, /<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${esc(img)}" />`, 'og:image');
    h = setTag(h, /<meta property="og:image:secure_url" content="[^"]*"\s*\/?>/, `<meta property="og:image:secure_url" content="${esc(img)}" />`, 'og:image:secure_url');
    h = setTag(h, /<meta property="og:image:type" content="[^"]*"\s*\/?>/, `<meta property="og:image:type" content="${esc(item.image.type)}" />`, 'og:image:type');
    h = setTag(h, /<meta property="og:image:width" content="[^"]*"\s*\/?>/, `<meta property="og:image:width" content="${item.image.width}" />`, 'og:image:width');
    h = setTag(h, /<meta property="og:image:height" content="[^"]*"\s*\/?>/, `<meta property="og:image:height" content="${item.image.height}" />`, 'og:image:height');
    h = setTag(h, /<meta name="twitter:image" content="[^"]*"\s*\/?>/, `<meta name="twitter:image" content="${esc(img)}" />`, 'twitter:image');
  }
  return h;
}

const fileName = (p) => p.replace(/^\/+/, '').replace(/\//g, '__');

fs.mkdirSync(path.join(DIST, 'seo'), { recursive: true });
for (const item of sitelinks) {
  fs.writeFileSync(path.join(DIST, 'seo', `${fileName(item.path)}.html`), pageHtml(item));
}

// 其他網址用的外殼：拿掉首頁 canonical 與 og:url
let app = shell;
app = setTag(app, /\s*<link rel="canonical" href="[^"]*"\s*\/?>/, '', 'canonical');
app = setTag(app, /\s*<meta property="og:url" content="[^"]*"\s*\/?>/, '', 'og:url');
fs.writeFileSync(path.join(DIST, 'app.html'), app);

// sitemap
const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const urls = [{ loc: `${SITE}/`, pr: '1.0' }].concat(
  sitelinks
    .filter((s) => !NOT_IN_SITEMAP.has(s.id))
    .map((s) => ({ loc: `${SITE}${s.path}`, pr: s.path.split('/').length > 2 ? '0.7' : '0.9' })),
);
const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>${u.pr}</priority>\n  </url>`).join('\n') +
  '\n</urlset>\n';
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml);

console.log(`seo-pages: ${sitelinks.length} 個分頁、sitemap ${urls.length} 筆`);

// 確認 vercel.json 每個分頁都有對應的轉址規則，避免新增分頁卻忘了加
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const missing = sitelinks.filter((s) => !vercel.rewrites.some((r) => r.source === s.path && r.destination === `/seo/${fileName(s.path)}.html`));
if (missing.length) throw new Error(`seo-pages: vercel.json 缺少這些分頁的 rewrites：${missing.map((s) => s.path).join('、')}`);
