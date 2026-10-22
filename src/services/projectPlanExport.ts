import { getAuthHeaders } from './authHeader';

export interface ProjectPlanSource {
  id: string;
  postType?: string;
  title?: string;
  appName?: string;
  description?: string;
  referencedPainPoint?: string;
  targetGoal?: string;
  techArchitecture?: string;
  proposalProgressStage?: string;
  currentVersion?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  mindMap?: unknown;
  publishedPlatforms?: unknown[];
}

export interface ProjectPlanDocument {
  title: string;
  subtitle: string;
  executiveSummary: string;
  sections: Array<{ heading: string; content: string; bullets: string[] }>;
}

export class ProjectPlanExportError extends Error {
  balance?: number;
}

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char] || char));

function buildWordHtml(plan: ProjectPlanDocument): string {
  const sections = plan.sections.map((section) => `
    <section class="section">
      <h2>${escapeHtml(section.heading)}</h2>
      <p>${escapeHtml(section.content).replace(/\n/g, '<br>')}</p>
      ${section.bullets?.length ? `<ul>${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>` : ''}
    </section>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(plan.title)}</title>
    <style>
      @page { size: A4; margin: 2.1cm 2cm; }
      body { color:#292524; font-family: "Microsoft JhengHei", "Noto Sans TC", sans-serif; line-height:1.8; font-size:11pt; }
      .brand { color:#b45309; font-size:10pt; font-weight:bold; letter-spacing:2px; }
      h1 { color:#1c1917; font-size:25pt; line-height:1.35; margin:26pt 0 8pt; }
      .subtitle { color:#78716c; font-size:12pt; margin-bottom:30pt; }
      h2 { color:#92400e; font-size:15pt; border-bottom:1px solid #fcd34d; padding-bottom:5pt; margin:22pt 0 8pt; }
      p { white-space:normal; margin:5pt 0 9pt; }
      li { margin:3pt 0; padding-left:3pt; }
      .summary { padding:12pt 15pt; border-left:4px solid #f59e0b; background:#fffbeb; }
      .footer { color:#a8a29e; border-top:1px solid #e7e5e4; padding-top:8pt; margin-top:32pt; font-size:9pt; }
    </style></head><body>
      <div class="brand">IdeaX · 創點子</div>
      <h1>${escapeHtml(plan.title)}</h1>
      ${plan.subtitle ? `<div class="subtitle">${escapeHtml(plan.subtitle)}</div>` : ''}
      <h2>企劃摘要</h2><p class="summary">${escapeHtml(plan.executiveSummary).replace(/\n/g, '<br>')}</p>
      ${sections}
      <div class="footer">由 IdeaX 專案企劃書匯出功能整理 · ${new Date().toLocaleDateString('zh-TW')}</div>
    </body></html>`;
}

function downloadPlan(plan: ProjectPlanDocument) {
  const blob = new Blob(['\ufeff', buildWordHtml(plan)], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const baseName = (plan.title || 'IdeaX-專案企劃書').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').trim().slice(0, 80) || 'IdeaX-專案企劃書';
  anchor.href = url;
  anchor.download = `${baseName}.doc`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function exportProjectPlan(project: ProjectPlanSource): Promise<{ balance: number }> {
  const requestId = crypto.randomUUID();
  const response = await fetch('/api/ai/project-plan-export', {
    method: 'POST',
    headers: await getAuthHeaders(),
    cache: 'no-store',
    body: JSON.stringify({ projectId: project.id, requestId, projectData: project }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success || !data.plan) {
    const error = new ProjectPlanExportError(data.error || `匯出失敗（${response.status}）`);
    if (typeof data.balance === 'number') error.balance = data.balance;
    throw error;
  }
  downloadPlan(data.plan as ProjectPlanDocument);
  return { balance: Number(data.balance) || 0 };
}
