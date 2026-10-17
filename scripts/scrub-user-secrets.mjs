/**
 * 一次性資料清除腳本：移除 users 集合中殘留的明碼密碼與實名認證個資
 *
 * 會做的事：
 *   1. 把每位使用者的 realNameAuthData 搬到 user_private/{uid}（僅本人與管理員可讀）
 *   2. 從 users/{uid} 刪除 password、realNameAuthData、realNameData 欄位
 *   3. 從 certifications/{uid} 刪除 realNameData 欄位
 *
 * 使用方式（在專案資料夾執行）：
 *   1. Firebase Console → 專案設定 → 服務帳戶 → 產生新的私密金鑰，下載 JSON
 *      （這個檔案等同最高權限，用完請刪除，絕對不要上傳到 GitHub）
 *   2. 先試跑（只列出會改什麼，不寫入）：
 *        GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/scrub-user-secrets.mjs
 *   3. 確認無誤後正式執行：
 *        GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/scrub-user-secrets.mjs --apply
 */
import { readFileSync } from 'fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');
const config = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));

const app = initializeApp({ credential: applicationDefault(), projectId: config.projectId });
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);

const SECRET_FIELDS = ['password', 'realNameAuthData', 'realNameData'];

const usersSnap = await db.collection('users').get();
let touched = 0;
let movedKyc = 0;

for (const docSnap of usersSnap.docs) {
  const data = docSnap.data();
  const present = SECRET_FIELDS.filter((f) => data[f] !== undefined);
  if (present.length === 0) continue;
  touched++;

  console.log(`${APPLY ? '清除' : '[試跑] 將清除'} users/${docSnap.id}：${present.join(', ')}`);
  if (!APPLY) continue;

  if (data.realNameAuthData) {
    await db.collection('user_private').doc(docSnap.id).set(
      { realNameAuthData: data.realNameAuthData, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    movedKyc++;
  }

  const update = { hasIdDocuments: Boolean(data.realNameAuthData?.idCardFrontFile || data.realNameAuthData?.idCardBackFile) };
  for (const f of SECRET_FIELDS) update[f] = FieldValue.delete();
  await docSnap.ref.update(update);
}

const certSnap = await db.collection('certifications').get();
let certTouched = 0;
for (const docSnap of certSnap.docs) {
  if (docSnap.data().realNameData === undefined) continue;
  certTouched++;
  console.log(`${APPLY ? '清除' : '[試跑] 將清除'} certifications/${docSnap.id}：realNameData`);
  if (APPLY) await docSnap.ref.update({ realNameData: FieldValue.delete() });
}

console.log('\n==== 結果 ====');
console.log(`使用者文件含敏感欄位：${touched} 筆`);
console.log(`認證文件含實名資料：${certTouched} 筆`);
if (APPLY) {
  console.log(`已搬移實名資料至 user_private：${movedKyc} 筆`);
  console.log('完成。記得刪除服務帳戶金鑰檔案。');
} else {
  console.log('這是試跑，沒有寫入任何資料。確認後加上 --apply 正式執行。');
}
