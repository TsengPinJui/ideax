/**
 * 把 Express 後端（server.ts）打包成 Vercel 伺服器函式 api/index.mjs
 *
 * Vercel 只會把 api/ 資料夾裡的檔案當成後端執行；沒有這個檔案時，網站上所有 /api/* 都會是 404
 * （寄信、AI 功能、管理員工具都不會運作）。
 * 每次 npm run build 會自動重新產生；修改後端程式後也請執行 npm run build:api 並一起提交。
 */
import { build } from 'esbuild';

await build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  outfile: 'api/index.mjs',
  banner: {
    js: [
      '// 此檔案由 scripts/build-api.mjs 自動產生，請勿手動修改',
      "import { createRequire as __createRequire } from 'module';",
      'const require = __createRequire(import.meta.url);',
    ].join('\n'),
  },
  logLevel: 'warning',
});
console.log('✓ api/index.mjs 已產生');
