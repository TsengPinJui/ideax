import { Question } from '../types';
import { isSimulatedQuestion } from '../data/virtualProposalsSeed';

/**
 * 真實存在的作品與提案（雖然隨種子資料一起建立，但不是範例）。
 * 新增真實作品時，把它的問題 ID 加進這裡，就不會顯示「範例」標籤。
 */
export const REAL_SHOWCASE_IDS = new Set<string>([
  // IdeaX 創點子本身
  'q-vp-idea-ideax',
  'q-vp-vibe-ideax',
  // DeeperDigger 系列
  'q-vp-idea-deeperdigger',
  'q-vp-vibe-deeperdigger',
  'q-vp-vibe-aiwolf',
  'q-vp-vibe-mazewar',
  // NexSight 洞鑑
  'q-vp-vibe-nexsight',
  // GoSun 晴享傘、PACE、AI壓呀
  'q-vp-idea-gosun',
  'q-vp-vibe-gosun',
  'q-vp-idea-pace',
  'q-vp-vibe-pace',
  'q-vp-idea-aiyaya',
  'q-vp-vibe-aiyaya',
]);

/** 是否為示範用內容（前台會顯示「範例」標籤，讓訪客知道不是真實會員發布） */
export function isSampleContent(q?: Partial<Question> | null): boolean {
  if (!q || !q.id) return false;
  if (REAL_SHOWCASE_IDS.has(q.id)) return false;
  return isSimulatedQuestion(q);
}
