/**
 * 瀏覽器支不支援 WebGL（3D 角色用）。
 * 只檢查一次並記住結果，檢查用的繪圖環境用完立刻釋放。
 * 以前每次畫面更新都新建一個、又不釋放，數量超過瀏覽器上限（約 16 個）時，
 * 瀏覽器會強制關掉最舊的，小燈泡、搜搜就會一閃一閃甚至消失。
 */
let cached: boolean | null = null;

export function supportsWebGL(): boolean {
  if (cached !== null) return cached;
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    cached = !!gl;
    try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch {}
  } catch {
    cached = false;
  }
  return cached;
}
