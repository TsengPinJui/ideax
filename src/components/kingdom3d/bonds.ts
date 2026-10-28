import { ref, onValue, set, remove, serverTimestamp, Database, Unsubscribe } from 'firebase/database';

/**
 * 羈絆（雙向綁定）：
 * - 點其他旅人 →「邀請綁定羈絆」：在 kingdomBonds/{自己} 寫下 { to: 對方, n: 自己暱稱 }
 * - 對方也指向自己（接受邀請）就成為羈絆夥伴，兩人之間出現一條發光的羈絆線
 * - 只存身分鍵、暱稱與時間；解除就把自己那一筆刪掉
 * - 身分鍵：會員用帳號、訪客用這台瀏覽器的訪客碼（重新整理後羈絆仍在）
 */

const PATH = 'kingdomBonds';
const STALE_MS = 7 * 24 * 3600 * 1000;

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
    set(ref(this.db, `${PATH}/${this.key}`), { to: otherKey.slice(0, 64), n: this.name, t: serverTimestamp() }).catch(() => {});
  }

  /** 取消邀請或解除羈絆 */
  release() {
    if (!this.db) return;
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
