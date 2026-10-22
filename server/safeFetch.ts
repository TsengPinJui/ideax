/**
 * 對「使用者提供的網址」發出請求前的安全檢查（防 SSRF）：
 * 只允許 http/https、標準埠，且主機解析出的 IP 不可是內網、本機、雲端中繼資料等位址；
 * 轉址逐跳檢查，不讓外部網址轉進內網。
 */
import { lookup } from 'node:dns/promises';
import net from 'node:net';

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local / 雲端中繼資料
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return isPrivateIPv4(v.slice(7));
  return (
    v === '::' || v === '::1' ||
    v.startsWith('fc') || v.startsWith('fd') || // ULA
    v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb') || // link-local
    v.startsWith('ff') // multicast
  );
}

/** 網址是否可安全對外請求；不安全時回傳原因 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  const u = new URL(raw);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('blocked-protocol');
  if (u.username || u.password) throw new Error('blocked-credentials');
  if (u.port && !['80', '443', '8080', '8443'].includes(u.port)) throw new Error('blocked-port');
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new Error('blocked-host');
  }
  if (net.isIP(host)) {
    if (isPrivateIP(host)) throw new Error('blocked-ip');
    return u;
  }
  const addrs = await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIP(a.address))) throw new Error('blocked-ip');
  return u;
}

/** 逐跳檢查的 fetch（最多 5 次轉址） */
export async function safeFetch(raw: string, init: RequestInit = {}, maxRedirects = 5): Promise<Response> {
  let current = raw;
  for (let i = 0; i <= maxRedirects; i++) {
    const u = await assertPublicUrl(current);
    const r = await fetch(u.toString(), { ...init, redirect: 'manual' });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      current = new URL(r.headers.get('location') as string, u).toString();
      continue;
    }
    // 讓呼叫端能讀到最終網址
    Object.defineProperty(r, 'url', { value: u.toString() });
    return r;
  }
  throw new Error('too-many-redirects');
}
