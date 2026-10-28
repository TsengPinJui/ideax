import { ref, onValue, runTransaction, set, update, remove, onDisconnect, serverTimestamp, Database, Unsubscribe } from 'firebase/database';

/**
 * 遊湖乘船（多人共用）：
 * - 同時最多 MAX_BOATS 艘船，每艘最多兩人（船主划船，另一位是乘客）
 * - 船滿時可以在渡口排隊；有空船時依排隊順序通知，按「乘船」馬上上船，按「再等等」排到最後、下次輪到時再通知；
 *   10 秒沒回應就輪到下一位（自己排到最後，連續 3 次沒回應就離開隊伍）
 * - 資料放在 Realtime Database：kingdomBoats/slots/{0..24}、kingdomBoats/queue/{身分鍵}
 * - 沒有資料庫或連不上時，退回只有自己的單機船（沒有名額限制）
 */

export const MAX_BOATS = 25;
export const OFFER_SECONDS = 10;
const STALE_MS = 40000;
const SLOTS = 'kingdomBoats/slots';
const QUEUE = 'kingdomBoats/queue';

export interface BoatSlot {
  index: number;
  o: string; // 船主
  on: string;
  p?: string; // 乘客
  pn?: string;
  x: number;
  z: number;
  r: number;
  t: number;
  d?: string; // 從哪個渡口出發／停在哪個渡口
  w?: number; // 1＝靠岸等人（可以加入當乘客）
}

export interface QueueEntry {
  key: string;
  n: string;
  t: number;
  s: number;
}

export type BoatRole = 'owner' | 'passenger';

export interface BoatingState {
  online: boolean;
  slots: BoatSlot[];
  active: number;
  queue: QueueEntry[];
  myQueueRank: number; // -1＝沒排隊
  offer: boolean;
}

export class BoatingService {
  private db: Database | null = null;
  private key = '';
  private name = '旅人';
  private now: () => number = () => Date.now();
  private unsubs: Unsubscribe[] = [];
  public slots: BoatSlot[] = [];
  public queue: QueueEntry[] = [];
  public online = false;
  public mySlot: number | null = null;
  public myRole: BoatRole | null = null;
  public onChange?: () => void;
  private queued = false;
  private skips = 0;

  start(db: Database | null, key: string, name: string, now: () => number) {
    this.stop();
    this.db = db;
    this.key = key;
    this.name = name || '旅人';
    this.now = now;
    if (!db || !key) {
      this.online = false;
      this.onChange?.();
      return;
    }
    try {
      this.unsubs.push(
        onValue(
          ref(db, SLOTS),
          (snap) => {
            this.online = true;
            const v = (snap.val() || {}) as Record<string, any>;
            const t = this.now();
            this.slots = Object.entries(v)
              .map(([i, s]) => ({ index: Number(i), ...(s as any) }) as BoatSlot)
              .filter((s) => s && typeof s.t === 'number' && t - s.t < STALE_MS && Number.isFinite(s.x) && Number.isFinite(s.z));
            // 自己的船被拿走（例如船主下船）→ 交給畫面處理
            this.onChange?.();
          },
          () => {
            this.online = false;
            this.onChange?.();
          }
        )
      );
      this.unsubs.push(
        onValue(
          ref(db, QUEUE),
          (snap) => {
            const v = (snap.val() || {}) as Record<string, any>;
            const t = this.now();
            this.queue = Object.entries(v)
              .map(([k, e]) => ({ key: k, n: String(e?.n || '旅人'), t: Number(e?.t) || 0, s: Number(e?.s) || 0 }))
              .filter((e) => t - e.t < 30 * 60 * 1000)
              .sort((a, b) => a.t - b.t);
            this.queued = this.queue.some((e) => e.key === this.key);
            this.onChange?.();
          },
          () => {}
        )
      );
    } catch {
      this.online = false;
    }
  }

  setName(n: string) {
    this.name = n || '旅人';
  }

  get myKey() {
    return this.key;
  }

  get active() {
    return this.slots.length;
  }

  get myQueueRank() {
    return this.queue.findIndex((e) => e.key === this.key);
  }

  /** 排在前面、而且空船數夠分到自己 → 該通知自己了 */
  get hasOffer() {
    const rank = this.myQueueRank;
    if (rank < 0 || !this.online) return false;
    return rank < MAX_BOATS - this.active;
  }

  /** 某個渡口有沒有船主在等人、還有空位 */
  joinableAt(dockId: string) {
    return this.slots.find((s) => s.d === dockId && s.w === 1 && !s.p && s.o !== this.key) || null;
  }

  mySlotData() {
    return this.mySlot === null ? null : this.slots.find((s) => s.index === this.mySlot) || null;
  }

  /** 開一艘新船（搶一個空位）；成功回傳位置編號 */
  async claim(x: number, z: number, r: number, dockId: string): Promise<number | null> {
    if (!this.db || !this.online) {
      this.mySlot = -1; // 單機船
      this.myRole = 'owner';
      return -1;
    }
    const used = new Set(this.slots.map((s) => s.index));
    const order = Array.from({ length: MAX_BOATS }, (_, i) => i).sort((a, b) => Number(used.has(a)) - Number(used.has(b)));
    const tNow = this.now();
    for (const i of order) {
      try {
        const res = await runTransaction(ref(this.db, `${SLOTS}/${i}`), (cur: any) => {
          if (cur && typeof cur.t === 'number' && tNow - cur.t < STALE_MS && cur.o !== this.key) return undefined;
          return { o: this.key, on: this.name.slice(0, 20), x: round(x), z: round(z), r: round(r), t: tNow, d: dockId, w: 1 };
        });
        if (res.committed) {
          this.mySlot = i;
          this.myRole = 'owner';
          onDisconnect(ref(this.db, `${SLOTS}/${i}`)).remove().catch(() => {});
          await this.leaveQueue();
          return i;
        }
      } catch {
        // 這一格被搶走或沒權限，試下一格
      }
    }
    return null;
  }

  /** 搭別人的船當乘客 */
  async join(slotIndex: number): Promise<boolean> {
    if (!this.db) return false;
    try {
      const res = await runTransaction(ref(this.db, `${SLOTS}/${slotIndex}`), (cur: any) => {
        if (!cur || cur.p || cur.o === this.key) return undefined;
        return { ...cur, p: this.key, pn: this.name.slice(0, 20) };
      });
      if (res.committed) {
        this.mySlot = slotIndex;
        this.myRole = 'passenger';
        onDisconnect(ref(this.db, `${SLOTS}/${slotIndex}/p`)).remove().catch(() => {});
        onDisconnect(ref(this.db, `${SLOTS}/${slotIndex}/pn`)).remove().catch(() => {});
        await this.leaveQueue();
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  /** 船主回報船的位置（約每 0.25 秒；停著不動時 5 秒一次） */
  private lastPush = 0;
  private lastPos = { x: NaN, z: NaN, r: NaN, w: -1 };
  push(x: number, z: number, r: number, waiting: boolean) {
    if (!this.db || this.mySlot === null || this.mySlot < 0 || this.myRole !== 'owner') return;
    const now = performance.now();
    const moved = Math.abs(x - this.lastPos.x) > 0.05 || Math.abs(z - this.lastPos.z) > 0.05 || Math.abs(r - this.lastPos.r) > 0.03 || (waiting ? 1 : 0) !== this.lastPos.w;
    if (now - this.lastPush < (moved ? 250 : 5000)) return;
    this.lastPush = now;
    this.lastPos = { x, z, r, w: waiting ? 1 : 0 };
    update(ref(this.db, `${SLOTS}/${this.mySlot}`), { x: round(x), z: round(z), r: round(r), t: serverTimestamp(), w: waiting ? 1 : 0 }).catch(() => {});
  }

  setDock(dockId: string | null) {
    if (!this.db || this.mySlot === null || this.mySlot < 0 || this.myRole !== 'owner') return;
    update(ref(this.db, `${SLOTS}/${this.mySlot}`), { d: dockId || '' }).catch(() => {});
  }

  /** 下船 */
  async leave() {
    const i = this.mySlot;
    const role = this.myRole;
    this.mySlot = null;
    this.myRole = null;
    if (!this.db || i === null || i < 0) return;
    try {
      if (role === 'owner') {
        await remove(ref(this.db, `${SLOTS}/${i}`));
        onDisconnect(ref(this.db, `${SLOTS}/${i}`)).cancel().catch(() => {});
      } else {
        await update(ref(this.db, `${SLOTS}/${i}`), { p: null, pn: null });
      }
    } catch {
      // ignore
    }
  }

  async enqueue() {
    if (!this.db) return;
    this.skips = 0;
    await set(ref(this.db, `${QUEUE}/${this.key}`), { n: this.name.slice(0, 20), t: serverTimestamp(), s: 0 }).catch(() => {});
    onDisconnect(ref(this.db, `${QUEUE}/${this.key}`)).remove().catch(() => {});
  }

  /** 再等等（或 10 秒沒回應）：排到最後；連續 3 次沒回應就離開隊伍 */
  async requeue(timedOut: boolean) {
    if (!this.db) return;
    this.skips = timedOut ? this.skips + 1 : 0;
    if (timedOut && this.skips >= 3) {
      await this.leaveQueue();
      return;
    }
    await update(ref(this.db, `${QUEUE}/${this.key}`), { t: serverTimestamp(), s: this.skips }).catch(() => {});
  }

  async leaveQueue() {
    if (!this.db || !this.queued) return;
    this.queued = false;
    await remove(ref(this.db, `${QUEUE}/${this.key}`)).catch(() => {});
  }

  get isQueued() {
    return this.queued;
  }

  stop() {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    if (this.db && this.mySlot !== null && this.mySlot >= 0) void this.leave();
    if (this.db && this.queued) void this.leaveQueue();
  }
}

const round = (n: number) => Math.round(n * 100) / 100;
