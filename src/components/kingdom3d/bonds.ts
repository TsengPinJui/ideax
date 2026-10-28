import { ref, onValue, set, remove, serverTimestamp, Database, Unsubscribe } from 'firebase/database';

/**
 * 羈絆（雙向綁定）：
 * - 點其他旅人 →「邀請綁定羈絆」：在 kingdomBonds/{自己} 寫下 { to: 對方, n: 自己暱稱 }
 * - 對方也指向自己（接受邀請）就成為羈絆夥伴，兩人之間出現一條發光的羈絆線
 * - 只存身分鍵、暱稱與時間；解除就把自己那一筆刪掉
 * - 身分鍵：會員用帳號、訪客用這台瀏覽器的訪客碼（重新整理後羈絆仍在）
 * - 備援：如果 kingdomBonds 的資料庫規則還沒發布（讀取被拒），改把邀請寫在已經開放的 kingdomPresence 底下
 *   kingdomPresence/{自己}/bond~{對方身分鍵的短雜湊}（座標放在地圖外很遠的地方，舊版畫面也看不到）
 */

const PATH = 'kingdomBonds';
const PRESENCE = 'kingdomPresence';
const STALE_MS = 7 * 24 * 3600 * 1000;
export const BOND_SID_PREFIX = 'bond~';
/** 身分鍵的短雜湊（FNV-1a 32 位元） */
export function bondHash(k: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < k.length; i++) {
    h ^= k.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

export interface BondEntry {
  key: string;
  to: string;
  n: string;
  t: number;
}

export interface BondState {
  online: boolean;
  /** 自己邀請了誰（還沒成為夥伴時就是「邀請中」） */
  outgoing: string | null;
  /** 誰邀請了自己（自己還沒回應的） */
  incoming: BondEntry[];
  /** 已互相綁定的夥伴 */
  partner: { key: string; name: string } | null;
}

export class BondService {
  private db: Database | null = null;
  private key = '';
  private name = '旅人';
  private unsub: Unsubscribe | null = null;
  private all = new Map<string, BondEntry>();
  private declined = new Set<string>();
  public onChange?: () => void;
  public state: BondState = { online: false, outgoing: null, incoming: [], partner: null };

  get myKey() {
    return this.key;
  }

  /** kingdomBonds 讀不到時改用 kingdomPresence 備援 */
  private fallback = false;

  start(db: Database | null, key: string, name: string) {
    this.stop();
    this.db = db;
    this.key = key;
    this.name = (name || '旅人').slice(0, 20);
    if (!db || !key) {
      this.recompute();
      return;
    }
    try {
      this.unsub = onValue(
        ref(db, PATH),
        (snap) => {
          if (this.fallback) return;
          this.all.clear();
          const raw = (snap.val() || {}) as Record<string, any>;
          const now = Date.now();
          for (const [k, v] of Object.entries(raw)) {
            if (!v || typeof v.to !== 'string') continue;
            const t = Number(v.t) || 0;
            if (t && now - t > STALE_MS) continue;
            this.all.set(k, { key: k, to: v.to, n: String(v.n || '旅人').slice(0, 20), t });
          }
          this.recompute(true);
        },
        () => this.startFallback()
      );
    } catch {
      this.startFallback();
    }
  }

  /** 備援：從 kingdomPresence 讀 bond~ 開頭的邀請 */
  private startFallback() {
    if (!this.db || this.fallback) {
      this.recompute(false);
      return;
    }
    this.fallback = true;
    this.unsub?.();
    try {
      this.unsub = onValue(
        ref(this.db, PRESENCE),
        (snap) => {
          this.all.clear();
          const raw = (snap.val() || {}) as Record<string, Record<string, any>>;
          const now = Date.now();
          // 先把每個身分鍵的雜湊算好，才能從雜湊找回對方
          const byHash = new Map<string, string>();
          for (const userKey of Object.keys(raw)) byHash.set(bondHash(userKey), userKey);
          byHash.set(bondHash(this.key), this.key);
          for (const [userKey, sessions] of Object.entries(raw)) {
            if (!sessions || typeof sessions !== 'object') continue;
            let best: BondEntry | null = null;
            for (const [sid, v] of Object.entries(sessions)) {
              if (!sid.startsWith(BOND_SID_PREFIX) || !v) continue;
              const t = Number(v.t) || 0;
              if (t && now - t > STALE_MS) continue;
              const to = byHash.get(sid.slice(BOND_SID_PREFIX.length));
              if (!to) continue;
              if (!best || t > best.t) best = { key: userKey, to, n: String(v.n || '旅人').slice(0, 20), t };
            }
            if (best) this.all.set(userKey, best);
          }
          this.recompute(true);
        },
        () => this.recompute(false)
      );
    } catch {
      this.recompute(false);
    }
  }

  stop() {
    this.unsub?.();
    this.unsub = null;
    this.all.clear();
    this.fallback = false;
  }

  setName(name: string) {
    this.name = (name || '旅人').slice(0, 20);
  }

  private recompute(online = this.state.online) {
    const mine = this.all.get(this.key);
    const outgoing = mine?.to || null;
    let partner: BondState['partner'] = null;
    if (outgoing) {
      const back = this.all.get(outgoing);
      if (back && back.to === this.key) partner = { key: outgoing, name: back.n };
    }
    const incoming = [...this.all.values()].filter((e) => e.to === this.key && e.key !== outgoing && !this.declined.has(e.key));
    this.state = { online: Boolean(this.db) && online, outgoing: partner ? null : outgoing, incoming, partner };
    this.onChange?.();
  }

  /** 邀請（或接受對方的邀請）：自己指向對方 */
  invite(otherKey: string) {
    if (!this.db || !otherKey || otherKey === this.key) return;
    this.declined.delete(otherKey);
    if (this.fallback) {
      const prev = this.all.get(this.key);
      if (prev && prev.to !== otherKey) remove(ref(this.db, `${PRESENCE}/${this.key}/${BOND_SID_PREFIX}${bondHash(prev.to)}`)).catch(() => {});
      // 欄位照 kingdomPresence 的規則（n、x、z、r、t）；座標放在地圖外很遠處，不會被當成旅人畫出來
      set(ref(this.db, `${PRESENCE}/${this.key}/${BOND_SID_PREFIX}${bondHash(otherKey)}`), { n: this.name, x: 4990, y: 0, z: 4990, r: 0, t: serverTimestamp() }).catch(() => {});
      return;
    }
    set(ref(this.db, `${PATH}/${this.key}`), { to: otherKey.slice(0, 64), n: this.name, t: serverTimestamp() }).catch(() => {});
  }

  /** 取消邀請或解除羈絆 */
  release() {
    if (!this.db) return;
    if (this.fallback) {
      const prev = this.all.get(this.key);
      if (prev) remove(ref(this.db, `${PRESENCE}/${this.key}/${BOND_SID_PREFIX}${bondHash(prev.to)}`)).catch(() => {});
      return;
    }
    remove(ref(this.db, `${PATH}/${this.key}`)).catch(() => {});
  }

  /** 婉拒某人的邀請（這次連線內不再提示） */
  decline(fromKey: string) {
    this.declined.add(fromKey);
    this.recompute();
  }

  /** 某位旅人和自己的關係 */
  relationTo(otherKey: string): 'partner' | 'invited' | 'inviting-me' | 'none' {
    if (this.state.partner?.key === otherKey) return 'partner';
    if (this.state.outgoing === otherKey) return 'invited';
    if (this.all.get(otherKey)?.to === this.key) return 'inviting-me';
    return 'none';
  }
}
