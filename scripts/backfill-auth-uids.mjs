/**
 * 一次性資料補齊腳本：替舊資料補上 Firebase 登入帳號 UID，讓新的資料庫權限規則能正確判斷誰能讀取
 *
 * 會做的事：
 *   1. users：找出每位會員對應的 Firebase 帳號（ID 相同，或 Email 相同），寫入 authUid
 *   2. conversations：依 participantIds 補上 participantAuthUids
 *   3. transactions：依 fromUserId / toUserId / solverId / userId（舊資料用名稱）補上 partyAuthUids
 *   4. notifications：依 userId 補上 recipientAuthUid
 *
 * 使用方式（在專案資料夾執行；服務帳戶 JSON 用完請刪除，絕對不要上傳到 GitHub）：
 *   先試跑（只列出會改什麼，不寫入）：
 *     GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/backfill-auth-uids.mjs
 *   確認無誤後正式執行：
 *     GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/backfill-auth-uids.mjs --apply
 */
import { readFileSync } from 'fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const APPLY = process.argv.includes('--apply');
const config = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
const app = initializeApp({ credential: applicationDefault(), projectId: config.projectId });
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);
const auth = getAuth(app);

const label = APPLY ? '更新' : '[試跑] 將更新';

// ---------- 1. users ----------
const appIdToUid = new Map();
const nameToUid = new Map();
const duplicateNames = new Set();
let usersLinked = 0;
let usersMissing = 0;

const usersSnap = await db.collection('users').get();
for (const d of usersSnap.docs) {
  const u = d.data();
  let uid = u.authUid || null;
  if (!uid) {
    try {
      uid = (await auth.getUser(d.id)).uid;
    } catch {}
  }
  if (!uid && u.email) {
    try {
      uid = (await auth.getUserByEmail(String(u.email).trim().toLowerCase())).uid;
    } catch {}
  }
  if (!uid) {
    usersMissing++;
    continue;
  }
  appIdToUid.set(d.id, uid);
  if (u.name) {
    if (nameToUid.has(u.name) && nameToUid.get(u.name) !== uid) duplicateNames.add(u.name);
    nameToUid.set(u.name, uid);
  }
  if (u.authUid !== uid) {
    usersLinked++;
    console.log(`${label} users/${d.id} authUid`);
    if (APPLY) await d.ref.update({ authUid: uid });
  }
}
for (const n of duplicateNames) nameToUid.delete(n); // 同名的人無法分辨，不用名稱對應

const resolve = (id) => (id ? appIdToUid.get(id) || null : null);

// ---------- 2. conversations ----------
let convTouched = 0;
const convSnap = await db.collection('conversations').get();
for (const d of convSnap.docs) {
  const c = d.data();
  const ids = [...(c.participantIds || []), c.participantId].filter(Boolean);
  const uids = [...new Set(ids.map(resolve).filter(Boolean))];
  const existing = new Set(c.participantAuthUids || []);
  if (uids.length === 0 || uids.every((u) => existing.has(u))) continue;
  convTouched++;
  console.log(`${label} conversations/${d.id} participantAuthUids (${uids.length} 人)`);
  if (APPLY) await d.ref.update({ participantAuthUids: FieldValue.arrayUnion(...uids) });
}

// ---------- 3. transactions ----------
let txTouched = 0;
const txSnap = await db.collection('transactions').get();
for (const d of txSnap.docs) {
  const t = d.data();
  const uids = new Set(
    [t.fromUserId, t.toUserId, t.solverId, t.userId].map(resolve).filter(Boolean)
  );
  for (const name of [t.fromUserName, t.toUserName]) {
    if (name && nameToUid.has(name)) uids.add(nameToUid.get(name));
  }
  const existing = new Set(t.partyAuthUids || []);
  const add = [...uids].filter((u) => !existing.has(u));
  if (add.length === 0) continue;
  txTouched++;
  console.log(`${label} transactions/${d.id} partyAuthUids (+${add.length})`);
  if (APPLY) await d.ref.update({ partyAuthUids: FieldValue.arrayUnion(...add) });
}

// ---------- 4. notifications ----------
let notifTouched = 0;
const notifSnap = await db.collection('notifications').get();
for (const d of notifSnap.docs) {
  const n = d.data();
  if (!n.userId || n.userId === 'all' || n.userId === 'admin' || n.recipientAuthUid) continue;
  const uid = resolve(n.userId);
  if (!uid) continue;
  notifTouched++;
  console.log(`${label} notifications/${d.id} recipientAuthUid`);
  if (APPLY) await d.ref.update({ recipientAuthUid: uid });
}

console.log('\n===== 結果 =====');
console.log(`會員：${usersLinked} 位補上 Firebase 帳號；${usersMissing} 位找不到對應的 Firebase 帳號（舊的本機帳號，需重新註冊或登入一次）`);
console.log(`私訊：${convTouched} 段對話`);
console.log(`交易：${txTouched} 筆`);
console.log(`通知：${notifTouched} 則`);
if (!APPLY) console.log('\n這是試跑，沒有寫入任何資料。確認無誤後加上 --apply 正式執行。');
process.exit(0);
