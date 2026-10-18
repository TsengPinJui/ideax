/**
 * 把 Express 後端（server.ts）打包成 api/_server.mjs，由 Vercel 伺服器函式 api/index.mjs 載入
 *
 * Vercel 只會把 api/ 資料夾裡的檔案當成後端執行；沒有這個檔案時，網站上所有 /api/* 都會是 404
 * （寄信、AI 功能、管理員工具都不會運作）。
 * 每次 npm run build 會自動重新產生；修改後端程式後也請執行 npm run build:api 並一起提交 api/_server.mjs。
 *
 * 套件幾乎全部打包進檔案（Vercel 的執行環境無法 require ES Module 套件，且只會附上它追蹤得到的套件）。
 * 例外：@google-cloud/firestore 依賴執行時讀取的 proto 檔，保持外部載入，並在 api/index.mjs 標示讓 Vercel 附上。
 */
import { build } from 'esbuild';

await build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: ['@google-cloud/firestore', '@google-cloud/storage'],
  outfile: 'api/_server.mjs',
  banner: {
    js: [
      '// 此檔案由 scripts/build-api.mjs 自動產生，請勿手動修改',
      "import { createRequire as __createRequire } from 'module';",
      "import { fileURLToPath as __fileURLToPath } from 'url';",
      "import { dirname as __pathDirname } from 'path';",
      'const require = __createRequire(import.meta.url);',
      'const __filename = __fileURLToPath(import.meta.url);',
      'const __dirname = __pathDirname(__filename);',
    ].join('\n'),
  },
  logLevel: 'error',
});
console.log('✓ api/_server.mjs 已產生');
