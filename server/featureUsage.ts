/**
 * 各大功能使用統計（v3.4.0 起）
 * - 前端：同一位訪客同一天用同一個功能只回報一次（記在瀏覽器）
 * - 這裡：每天一份文件 feature_usage/{YYYY-MM-DD}，counts.{功能} 累加；另有 feature_usage/_total 記全部累計
 * - 只收白名單裡的功能代號，避免被塞奇怪的欄位
 */
import { getApps } from 'firebase-admin/app';
import firebaseConfigJson from '../firebase-applet-config.json';
import { hasAdminCredentials } from './competitionService';

export const FEATURE_LABELS: Record<string, string> = {
  explore: '首頁探索',
  question: '卡片內容頁',
  jobs: '匯職缺',
  vibecoding: 'VibeCoding 展場',
  painpoints: '痛點',
  create: '發布創點子',
  discussion: '討論區',
  solvers: '專家',
  challenge: '創星季',
  membership: '會員與儲值',
  my_projects: '我的案件',
  agents: '關於與角色',
  mascot_chat: '小燈泡對話',
  customer_service: '客服（多慧）',
};

async function getDb() {
  if (!hasAdminCredentials) return null;
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const app = getApps()[0];
  const dbId = (firebaseConfigJson as any).firestoreDatabaseId;
  return { db: dbId ? getFirestore(app, dbId) : getFirestore(app), FieldValue };
}

function twDay(d = new Date()): string {
  return new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}

export async function recordFeatureUse(feature: unknown): Promise<boolean> {
  const f = String(feature || '');
  if (!(f in FEATURE_LABELS)) return false;
  const conn = await getDb();
  if (!conn) return false;
  const { db, FieldValue } = conn;
  const day = twDay();
  await Promise.all([
    db.collection('feature_usage').doc(day).set({ day, counts: { [f]: FieldValue.increment(1) } }, { merge: true }),
    db.collection('feature_usage').doc('_total').set({ counts: { [f]: FieldValue.increment(1) }, updatedAt: new Date().toISOString() }, { merge: true }),
  ]);
  return true;
}

/** 近 N 天每天的使用人數，以及開始記錄以來的累計 */
export async function getFeatureUsage(days = 30) {
  const conn = await getDb();
  if (!conn) return { labels: FEATURE_LABELS, days: [], total: {} };
  const { db } = conn;
  const n = Math.max(1, Math.min(120, Math.floor(days) || 30));
  const ids: string[] = [];
  for (let i = n - 1; i >= 0; i--) ids.push(twDay(new Date(Date.now() - i * 86400000)));
  const snaps = await db.getAll(...ids.map((id) => db.collection('feature_usage').doc(id)), db.collection('feature_usage').doc('_total'));
  const totalSnap = snaps.pop() as any;
  return {
    labels: FEATURE_LABELS,
    days: snaps.map((s: any, i: number) => ({ day: ids[i], counts: (s.exists && s.data()?.counts) || {} })),
    total: (totalSnap?.exists && totalSnap.data()?.counts) || {},
  };
}
