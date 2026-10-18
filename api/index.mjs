/**
 * Vercel 伺服器函式入口：載入打包好的 Express 後端（api/_server.mjs）
 * 載入失敗時回傳錯誤摘要（不含任何金鑰），方便排查部署問題。
 */
let appPromise = null;

// 讓 Vercel 打包函式時附上這個外部套件（只有管理員補齊工具會用到，平常不會執行這段）
if (process.env.IDEAX_TRACE_ONLY === '1') {
  import('@google-cloud/firestore');
}

function loadApp() {
  if (!appPromise) {
    appPromise = import('./_server.mjs').then((m) => m.default);
  }
  return appPromise;
}

export default async function handler(req, res) {
  try {
    const app = await loadApp();
    return app(req, res);
  } catch (err) {
    appPromise = null;
    console.error('[api] 後端載入失敗:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: 'backend_load_failed',
        message: String(err?.message || err).slice(0, 500),
        code: err?.code || null,
        node: process.version,
      })
    );
  }
}
