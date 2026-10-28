import { Database, onDisconnect, onValue, ref, remove, runTransaction, Unsubscribe, update } from 'firebase/database';

const ROOT = 'kingdomLandRides';
const EXPIRE_MS = 45_000;

export interface LandRideRecord {
  riders?: Record<string, { name: string; seat: number; t: number }>;
  x?: number;
  y?: number;
  z?: number;
  yaw?: number;
  t?: number;
}

/** One-seat animal and two-seat carriage reservations shared by roaming players. */
export class LandRideService {
  rides: Record<string, LandRideRecord> = {};
  online = false;
  key = '';
  name = '旅人';
  private db: Database | null = null;
  private unsub: Unsubscribe | null = null;
  private lastPushAt = 0;
  private lastHeartbeatAt = 0;

  start(db: Database | null, key: string, name: string) {
    this.stop();
    this.db = db;
    this.key = key;
    this.name = name || '旅人';
    if (!db || !key) return;
    try {
      this.unsub = onValue(ref(db, ROOT), (snap) => {
        this.rides = (snap.val() || {}) as Record<string, LandRideRecord>;
        this.online = true;
      }, () => { this.online = false; });
    } catch {
      this.online = false;
    }
  }

  stop() {
    this.unsub?.();
    this.unsub = null;
    this.online = false;
  }

  async join(id: string, capacity: number): Promise<number | null> {
    if (!this.db || !this.online || !this.key) return 0;
    const now = Date.now();
    try {
      const result = await runTransaction(ref(this.db, `${ROOT}/${id}`), (current: LandRideRecord | null) => {
        const next = { ...(current || {}), riders: { ...(current?.riders || {}) } } as LandRideRecord;
        for (const [key, rider] of Object.entries(next.riders || {})) {
          if (now - (rider?.t || 0) > EXPIRE_MS) delete next.riders![key];
        }
        if (next.riders![this.key]) return next;
        const occupied = new Set(Object.values(next.riders!).map((r) => r.seat));
        const seat = Array.from({ length: capacity }, (_, i) => i).find((i) => !occupied.has(i));
        if (seat === undefined) return undefined;
        next.riders![this.key] = { name: this.name.slice(0, 24), seat, t: now };
        next.t = now;
        return next;
      });
      if (!result.committed) return null;
      await onDisconnect(ref(this.db, `${ROOT}/${id}/riders/${this.key}`)).remove();
      return result.snapshot.val()?.riders?.[this.key]?.seat ?? null;
    } catch {
      return null;
    }
  }

  push(id: string, seat: number, x: number, y: number, z: number, yaw: number) {
    if (!this.db || !this.key) return;
    const now = Date.now();
    if (seat > 0) {
      if (now - this.lastHeartbeatAt > 12000) {
        this.lastHeartbeatAt = now;
        update(ref(this.db, `${ROOT}/${id}/riders/${this.key}`), { t: now }).catch(() => {});
      }
      return;
    }
    if (now - this.lastPushAt < 250) return;
    this.lastPushAt = now;
    update(ref(this.db, `${ROOT}/${id}`), {
      x: round(x), y: round(y), z: round(z), yaw: round(yaw), t: now,
      [`riders/${this.key}/t`]: now,
    }).catch(() => {});
  }

  mySeat(id: string): number | null {
    const seat = this.rides[id]?.riders?.[this.key]?.seat;
    return Number.isFinite(seat) ? seat : null;
  }

  async leave(id: string) {
    if (!this.db || !this.key) return;
    try {
      await runTransaction(ref(this.db, `${ROOT}/${id}`), (current: LandRideRecord | null) => {
        if (!current) return null;
        const riders = { ...(current.riders || {}) };
        delete riders[this.key];
        if (!Object.keys(riders).length) return null;
        const sorted = Object.entries(riders).sort((a, b) => a[1].seat - b[1].seat);
        sorted.forEach(([, rider], seat) => { rider.seat = seat; });
        return { ...current, riders };
      });
    } catch {
      // A stale seat expires automatically when another rider claims it.
    }
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
