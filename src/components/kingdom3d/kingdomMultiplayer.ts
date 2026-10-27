import * as THREE from 'three';
import { getDatabase, ref, set, onValue, onDisconnect, remove, serverTimestamp, Database, Unsubscribe } from 'firebase/database';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { app, auth } from '../../services/firebase';

/**
 * 3D 五島多人同遊：用 Firebase Realtime Database 交換每位玩家的位置（每秒最多 5 次，停著不動就不送）。
 * - 需要在 Vercel 設定 VITE_FIREBASE_DATABASE_URL（Realtime Database 的網址），沒設定時自動關閉
 * - 只有登入的人會出現在世界裡、也只有登入的人看得到其他人；只傳暱稱與位置
 * - 離線（關分頁、斷線）時伺服器自動把自己移除
 * - 位置存在 kingdomPresence/{登入者 uid}/{這個分頁的 session}：同一個瀏覽器開多個分頁、
 *   或管理員切換示範帳號（共用同一個 Firebase 登入）時，彼此也看得到
 */

const DB_URL: string | undefined = (import.meta as any).env?.VITE_FIREBASE_DATABASE_URL || undefined;
const PATH = 'kingdomPresence';
const SEND_INTERVAL_MS = 200;
const HEARTBEAT_MS = 15000;
const STALE_MS = 45000;

export type MultiplayerStatus = 'off' | 'guest' | 'connecting' | 'online' | 'error';

export interface RemotePlayerState {
  id: string;
  name: string;
  color: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  t: number;
}

export const multiplayerConfigured = Boolean(DB_URL);

export class KingdomMultiplayer {
  private db: Database | null = null;
  private user: FirebaseUser | null = null;
  private unsubAuth: (() => void) | null = null;
  private unsubPlayers: Unsubscribe | null = null;
  private unsubOffset: Unsubscribe | null = null;
  private lastSent = 0;
  private last = { x: NaN, y: NaN, z: NaN, yaw: NaN };
  private serverOffset = 0;
  private name = '旅人';
  private color = 0;
  private readonly sid = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  public status: MultiplayerStatus = 'off';
  public onStatus?: (s: MultiplayerStatus) => void;
  public onPlayers?: (players: RemotePlayerState[]) => void;

  constructor(name: string, colorSeed: string) {
    this.setName(name);
    let h = 0;
    for (let i = 0; i < colorSeed.length; i++) h = (h * 31 + colorSeed.charCodeAt(i)) >>> 0;
    this.color = h % AVATAR_COLORS.length;
  }

  setName(name: string) {
    this.name = (name || '旅人').trim().slice(0, 20) || '旅人';
    this.last.x = NaN; // 下次一定送出
  }

  start() {
    if (!DB_URL) {
      this.setStatus('off');
      return;
    }
    try {
      this.db = getDatabase(app, DB_URL);
    } catch (e) {
      console.warn('[kingdom] 多人連線初始化失敗', e);
      this.setStatus('error');
      return;
    }
    this.unsubAuth = onAuthStateChanged(auth, (u) => {
      this.detach();
      this.user = u;
      if (!u) {
        this.setStatus('guest');
        this.onPlayers?.([]);
        return;
      }
      this.attach();
    });
  }

  private setStatus(s: MultiplayerStatus) {
    this.status = s;
    this.onStatus?.(s);
  }

  private attach() {
    if (!this.db || !this.user) return;
    const uid = this.user.uid;
    this.setStatus('connecting');
    const db = this.db;
    this.unsubOffset = onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
      this.serverOffset = Number(snap.val()) || 0;
    });
    const mine = ref(db, `${PATH}/${uid}/${this.sid}`);
    onDisconnect(mine)
      .remove()
      .catch(() => {});
    this.unsubPlayers = onValue(
      ref(db, PATH),
      (snap) => {
        const now = Date.now() + this.serverOffset;
        const list: RemotePlayerState[] = [];
        snap.forEach((userNode) => {
          userNode.forEach((child) => {
            const v = child.val();
            if (!v || (userNode.key === uid && child.key === this.sid)) return;
            if (typeof v.t !== 'number' || now - v.t > STALE_MS) return;
            if (![v.x, v.z, v.r].every((n: unknown) => typeof n === 'number' && Number.isFinite(n))) return;
            list.push({ id: `${userNode.key}/${child.key}`, name: String(v.n || '旅人').slice(0, 20), color: Number(v.c) || 0, x: v.x, y: Number(v.y) || 0, z: v.z, yaw: v.r, t: v.t });
          });
        });
        if (this.status !== 'online') this.setStatus('online');
        this.onPlayers?.(list);
      },
      (err) => {
        console.warn('[kingdom] 讀取其他玩家失敗', err?.message);
        this.setStatus('error');
      }
    );
  }

  private detach() {
    this.unsubPlayers?.();
    this.unsubPlayers = null;
    this.unsubOffset?.();
    this.unsubOffset = null;
    if (this.db && this.user) remove(ref(this.db, `${PATH}/${this.user.uid}/${this.sid}`)).catch(() => {});
    this.last.x = NaN;
  }

  /** 每一幀呼叫：位置有變（或太久沒送）才寫入 */
  update(x: number, y: number, z: number, yaw: number) {
    if (!this.db || !this.user || this.status === 'error') return;
    const now = performance.now();
    if (now - this.lastSent < SEND_INTERVAL_MS) return;
    const moved =
      !(Math.abs(x - this.last.x) < 0.12 && Math.abs(z - this.last.z) < 0.12 && Math.abs(y - this.last.y) < 0.12 && Math.abs(yaw - this.last.yaw) < 0.05);
    if (!moved && now - this.lastSent < HEARTBEAT_MS) return;
    this.lastSent = now;
    this.last = { x, y, z, yaw };
    const r2 = (n: number) => Math.round(n * 100) / 100;
    set(ref(this.db, `${PATH}/${this.user.uid}/${this.sid}`), { n: this.name, c: this.color, x: r2(x), y: r2(y), z: r2(z), r: r2(yaw), t: serverTimestamp() }).catch((err) => {
      console.warn('[kingdom] 位置同步失敗', err?.message);
      this.setStatus('error');
    });
  }

  dispose() {
    this.detach();
    this.unsubAuth?.();
    this.unsubAuth = null;
    this.onPlayers = undefined;
    this.onStatus = undefined;
  }
}

/* -------------------- 其他玩家的人偶 -------------------- */

export const AVATAR_COLORS = [0x2f5675, 0x8e2420, 0x3f6b4a, 0x6b4a8a, 0xb5651d, 0x2c6a62, 0x9a7322, 0x5a3a7a];

function nameTagTexture(name: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.font = '700 30px "Noto Serif TC","PMingLiU",serif';
  const w = Math.min(244, ctx.measureText(name).width + 28);
  ctx.fillStyle = 'rgba(28,16,8,0.78)';
  const x0 = (256 - w) / 2;
  ctx.beginPath();
  ctx.roundRect(x0, 8, w, 46, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(226,184,90,0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f6e7c4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 128, 32, 230);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Avatar {
  group: THREE.Group;
  tag: THREE.Sprite;
  name: string;
  target: THREE.Vector3;
  yaw: number;
  bob: number;
}

export class RemotePlayersView {
  private root = new THREE.Group();
  private avatars = new Map<string, Avatar>();
  private robeMats = AVATAR_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
  private skin = new THREE.MeshStandardMaterial({ color: 0xf1c9a5, roughness: 0.7 });
  private hat = new THREE.MeshStandardMaterial({ color: 0x241712, roughness: 0.7 });
  private robeGeo = new THREE.CylinderGeometry(0.22, 0.38, 1.2, 12);
  private shoulderGeo = new THREE.SphereGeometry(0.26, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  private headGeo = new THREE.SphereGeometry(0.17, 14, 12);
  private hatGeo = new THREE.CylinderGeometry(0.12, 0.2, 0.16, 12);
  private noseGeo = new THREE.SphereGeometry(0.04, 6, 6);

  constructor(scene: THREE.Scene) {
    this.root.name = 'remote_players';
    scene.add(this.root);
  }

  setPlayers(list: RemotePlayerState[]) {
    const seen = new Set<string>();
    for (const p of list) {
      seen.add(p.id);
      let a = this.avatars.get(p.id);
      if (!a) {
        a = this.create(p);
        this.avatars.set(p.id, a);
        a.group.position.set(p.x, p.y, p.z);
      }
      if (a.name !== p.name) {
        (a.tag.material as THREE.SpriteMaterial).map?.dispose();
        (a.tag.material as THREE.SpriteMaterial).map = nameTagTexture(p.name);
        a.name = p.name;
      }
      a.target.set(p.x, p.y, p.z);
      a.yaw = p.yaw;
    }
    for (const [id, a] of this.avatars) {
      if (!seen.has(id)) {
        this.root.remove(a.group);
        (a.tag.material as THREE.SpriteMaterial).map?.dispose();
        (a.tag.material as THREE.SpriteMaterial).dispose();
        this.avatars.delete(id);
      }
    }
  }

  get count() {
    return this.avatars.size;
  }

  private create(p: RemotePlayerState): Avatar {
    const g = new THREE.Group();
    const robe = this.robeMats[Math.abs(p.color) % this.robeMats.length];
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(0, y, z);
      m.castShadow = true;
      g.add(m);
    };
    add(this.robeGeo, robe, 0.6);
    add(this.shoulderGeo, robe, 1.18);
    add(this.headGeo, this.skin, 1.52);
    add(this.hatGeo, this.hat, 1.68);
    add(this.noseGeo, this.skin, 1.52, -0.17); // 臉朝 -Z（和玩家的前方一致）
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTagTexture(p.name), depthWrite: false, transparent: true }));
    tag.scale.set(1.6, 0.4, 1);
    tag.position.y = 2.15;
    tag.renderOrder = 6;
    g.add(tag);
    this.root.add(g);
    return { group: g, tag, name: p.name, target: new THREE.Vector3(p.x, p.y, p.z), yaw: p.yaw, bob: Math.random() * 6 };
  }

  update(dt: number) {
    const k = Math.min(1, dt * 8);
    for (const a of this.avatars.values()) {
      const g = a.group;
      const dist = g.position.distanceTo(a.target);
      if (dist > 25) g.position.copy(a.target);
      else g.position.lerp(a.target, k);
      // 走動時輕輕上下擺
      a.bob += dt * (dist > 0.05 ? 9 : 0);
      g.children[0].position.y = 0.6 + (dist > 0.05 ? Math.abs(Math.sin(a.bob)) * 0.05 : 0);
      let dy = a.yaw - g.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      g.rotation.y += dy * k;
    }
  }

  dispose() {
    this.setPlayers([]);
    this.root.parent?.remove(this.root);
    [this.robeGeo, this.shoulderGeo, this.headGeo, this.hatGeo, this.noseGeo].forEach((g) => g.dispose());
    [...this.robeMats, this.skin, this.hat].forEach((m) => m.dispose());
  }
}
