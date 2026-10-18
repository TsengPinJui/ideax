/**
 * 把 Express 後端（server.ts）打包成 api/_server.mjs，由 Vercel 伺服器函式 api/index.mjs 載入
 *
 * Vercel 只會把 api/ 資料夾裡的檔案當成後端執行；沒有這個檔案時，網站上所有 /api/* 都會是 404
 * （寄信、AI 功能、管理員工具都不會運作）。
 * 每次 npm run build 會自動重新產生；修改後端程式後也請執行 npm run build:api 並一起提交 api/_server.mjs。
 */
import { build } from 'esbuild';

await build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  // 套件大多不打包（由 Vercel 依 node_modules 載入），但 firebase-admin → jwks-rsa → jose 這條要一起打包：
  // jose 只提供 ES Module，Vercel 的執行環境不允許用 require 載入它，打包後由 esbuild 轉換即可正常運作
  plugins: [
    {
      name: 'externalize-most-packages',
      setup(b) {
        const BUNDLED = ['firebase-admin', 'jwks-rsa', 'jose'];
        b.onResolve({ filter: /^[^./]/ }, (args) => {
          const name = args.path.startsWith('@') ? args.path.split('/').slice(0, 2).join('/') : args.path.split('/')[0];
          if (BUNDLED.includes(name)) return undefined; // 交給 esbuild 打包
          return { path: args.path, external: true };
        });
      },
    },
  ],
  outfile: 'api/_server.mjs',
  banner: {
    js: [
      '// 此檔案由 scripts/build-api.mjs 自動產生，請勿手動修改',
      "import { createRequire as __createRequire } from 'module';",
      'const require = __createRequire(import.meta.url);',
    ].join('\n'),
  },
  logLevel: 'warning',
});
console.log('✓ api/_server.mjs 已產生');
