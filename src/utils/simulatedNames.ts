/**
 * 仿真帳號的顯示名稱以程式中的設定為準。
 *
 * 仿真帳號改名後，資料庫裡較早存下的貼文、留言、使用者資料可能還帶著舊名字；
 * 這裡依帳號 ID 把這些舊名字換成目前的名字。只處理仿真帳號（u-vc-*、vp-user-*、user-vibecoder-*），
 * 真實用戶的資料完全不動。沒有需要更換時回傳原本的物件，避免多餘的重新渲染。
 */
import { VIRTUAL_PERSONAS } from '../data/virtualProposalsSeed';

const EXTRA_SIM_NAMES: Record<string, string> = {
  'user-vibecoder-chef': 'ChefAlan_5star',
  'vp-user-01': 'JH_Lin.rd8',
  'vp-user-04': 'Meiling營養9',
};

let cache: Map<string, string> | null = null;
function nameMap(): Map<string, string> {
  if (!cache) {
    cache = new Map<string, string>();
    VIRTUAL_PERSONAS.forEach((p) => cache!.set(p.id, p.name));
    Object.entries(EXTRA_SIM_NAMES).forEach(([id, name]) => cache!.set(id, name));
  }
  return cache;
}

export function simulatedNameFor(id?: string | null): string | undefined {
  if (!id) return undefined;
  return nameMap().get(id);
}

function fixField<T extends Record<string, any>>(obj: T, idKey: string, nameKey: string): T {
  const want = simulatedNameFor(obj?.[idKey]);
  if (want && obj[nameKey] !== want) return { ...obj, [nameKey]: want };
  return obj;
}

function mapList<T>(list: T[], fn: (x: T) => T): T[] {
  if (!Array.isArray(list)) return list;
  let changed = false;
  const out = list.map((x) => {
    const y = x ? fn(x) : x;
    if (y !== x) changed = true;
    return y;
  });
  return changed ? out : list;
}

export function normalizeSimulatedUsers<T extends { id?: string; name?: string }>(list: T[]): T[] {
  return mapList(list, (u) => fixField(u as any, 'id', 'name'));
}

export function normalizeSimulatedQuestions<T extends Record<string, any>>(list: T[]): T[] {
  return mapList(list, (q) => {
    let next = fixField(q, 'authorId', 'authorName');
    if (Array.isArray(next.tipsHistory)) {
      const tips = mapList(next.tipsHistory, (t: any) => fixField(t, 'userId', 'userName'));
      if (tips !== next.tipsHistory) next = { ...next, tipsHistory: tips };
    }
    return next;
  });
}

export function normalizeSimulatedAnswers<T extends Record<string, any>>(list: T[]): T[] {
  return mapList(list, (a) => {
    let next = fixField(a, 'solverId', 'solverName');
    next = fixField(next, 'questionAuthorId', 'questionAuthorName');
    return next;
  });
}
