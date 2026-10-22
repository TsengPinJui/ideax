/**
 * 管理員一次修正資料庫裡因舊程式錯誤寫入的不實資料（先預覽、再執行）。
 * 判斷規則與前端共用 src/utils/dataRepair.ts。
 */
import { findAnswerFixes, findUserFixes, REPAIR_CATEGORY_LABELS, type FieldFix, type RepairCategory } from '../src/utils/dataRepair';
import { getServiceFirestore, patchMirrorDoc } from './competitionService';

const PRIVATE_FIELDS = new Set(['surveyData', 'annualSalary', 'realNameAuthData']);
export const ALL_REPAIR_CATEGORIES = Object.keys(REPAIR_CATEGORY_LABELS) as RepairCategory[];

export type RepairReport = {
  applied: boolean;
  counts: Record<string, { docs: number; fields: number }>;
  samples: Array<{ collection: string; id: string; name?: string; fixes: Array<{ field: string; from: unknown; to: unknown; category: RepairCategory }> }>;
  totalDocs: number;
  error?: string;
};

const show = (v: unknown) => (v === undefined ? '（移除）' : typeof v === 'object' ? JSON.stringify(v).slice(0, 40) : v);

export async function runDataRepair(apply: boolean, categories: RepairCategory[]): Promise<RepairReport> {
  const report: RepairReport = { applied: apply, counts: {}, samples: [], totalDocs: 0 };
  const svc = await getServiceFirestore();
  if (!svc) return { ...report, error: '伺服器沒有設定服務帳戶（FIREBASE_SERVICE_ACCOUNT），無法修正資料庫' };
  const { fs, FV } = svc;
  for (const c of categories) report.counts[c] = { docs: 0, fields: 0 };

  const count = (fixes: FieldFix[]) => {
    const seen = new Set<string>();
    for (const f of fixes) {
      report.counts[f.category].fields += 1;
      if (!seen.has(f.category)) { report.counts[f.category].docs += 1; seen.add(f.category); }
    }
  };
  const addSample = (collection: string, id: string, name: string | undefined, fixes: FieldFix[]) => {
    if (report.samples.length < 60) report.samples.push({ collection, id, name, fixes: fixes.map((f) => ({ ...f, from: show(f.from), to: show(f.to) })) });
  };

  let batch = fs.batch();
  let ops = 0;
  const flush = async () => { if (ops) { await batch.commit(); batch = fs.batch(); ops = 0; } };
  const write = async (ref: any, data: Record<string, any>) => {
    batch.set(ref, data, { merge: true });
    ops += 1;
    if (ops >= 400) await flush();
  };

  // 會員
  const userCats = categories.filter((c) => c !== 'fake_answer_defaults' && c !== 'fake_solver_rating');
  const usersSnap = await fs.collection('users').get();
  const privSnap = await fs.collection('user_private').get();
  const privMap = new Map<string, any>(privSnap.docs.map((d: any) => [d.id, d.data()]));
  const ratingOf = new Map<string, number>();
  for (const doc of usersSnap.docs) {
    const u = { ...doc.data(), id: doc.id };
    const priv = privMap.get(doc.id) || {};
    const fixes = userCats.length ? findUserFixes(u, priv, userCats) : [];
    const ratingFixed = fixes.find((f) => f.field === 'rating');
    ratingOf.set(doc.id, ratingFixed ? 0 : Number(u.rating || 0) * (Number(u.reviewCount || 0) > 0 ? 1 : 0));
    if (!fixes.length) continue;
    report.totalDocs += 1;
    count(fixes);
    addSample('users', doc.id, u.name, fixes);
    if (!apply) continue;
    const pub: Record<string, any> = {};
    const prv: Record<string, any> = {};
    const mirrorPatch: Record<string, any> = {};
    const mirrorDel: string[] = [];
    for (const f of fixes) {
      const val = f.to === undefined ? FV.delete() : f.to;
      if (PRIVATE_FIELDS.has(f.field)) prv[f.field] = val;
      // 舊資料可能還留在公開文件，一併清掉
      pub[f.field] = val;
      if (f.to === undefined) mirrorDel.push(f.field); else mirrorPatch[f.field] = f.to;
    }
    pub.dataRepairedAt = new Date().toISOString();
    await write(fs.collection('users').doc(doc.id), pub);
    if (Object.keys(prv).length && privMap.has(doc.id)) await write(fs.collection('user_private').doc(doc.id), prv);
    patchMirrorDoc('users', doc.id, mirrorPatch, mirrorDel);
  }

  // 解答與留言
  const ansCats = categories.filter((c) => c === 'fake_answer_defaults' || c === 'fake_solver_rating');
  if (ansCats.length) {
    const ansSnap = await fs.collection('answers').get();
    for (const doc of ansSnap.docs) {
      const a = { ...doc.data(), id: doc.id };
      const fixes = findAnswerFixes(a, ratingOf.get(a.solverId) ?? null, ansCats);
      if (!fixes.length) continue;
      report.totalDocs += 1;
      count(fixes);
      addSample('answers', doc.id, a.solverName, fixes);
      if (!apply) continue;
      const patch: Record<string, any> = {};
      const mirrorPatch: Record<string, any> = {};
      const mirrorDel: string[] = [];
      for (const f of fixes) {
        patch[f.field] = f.to === undefined ? FV.delete() : f.to;
        if (f.to === undefined) mirrorDel.push(f.field); else mirrorPatch[f.field] = f.to;
      }
      await write(fs.collection('answers').doc(doc.id), patch);
      patchMirrorDoc('answers', doc.id, mirrorPatch, mirrorDel);
    }
  }
  if (apply) await flush();
  return report;
}
