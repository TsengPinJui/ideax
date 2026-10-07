import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  Lock,
  Download,
  Copy,
  Check,
  ShieldAlert,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  BookOpen,
  FileCheck,
  Award,
  Sparkles,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  COMPETITION_RULES_A,
  GENERAL_USER_TERMS_B,
  PARTICIPANT_TERMS_C,
  EXPERT_JUDGE_TERMS_D,
  PLATFORM_GUIDE_E,
} from '../../data/competitionTermsData';

export const AdminCompetitionRulesArchiveFolder: React.FC = () => {
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.accountType === 'admin';

  const [selectedFileId, setSelectedFileId] = useState<string>('doc_a');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 權限嚴格阻擋：若非管理員，其他人絕對不能看到
  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-stone-100 rounded-3xl border border-stone-300 space-y-3 my-6">
        <Lock className="w-8 h-8 text-stone-400 mx-auto" />
        <h3 className="text-base font-black text-stone-800">機密存檔資料夾受權限保護</h3>
        <p className="text-xs text-stone-500 max-w-md mx-auto">
          此「創星季競賽全套規章與辦法官方存檔資料夾」僅供 IdeaX 平台超級管理員查閱與歸檔，一般會員、訪客與非管理員身分無權存取。
        </p>
      </div>
    );
  }

  // 封存資料夾內之 5 份官方規章與條款文件清單
  const archivedDocuments = [
    {
      id: 'doc_a',
      fileName: '01_IdeaX創星季_官方競賽辦法章程.md',
      title: COMPETITION_RULES_A.title,
      subtitle: COMPETITION_RULES_A.subtitle,
      code: 'A',
      category: '大會競賽辦法',
      updatedAt: COMPETITION_RULES_A.lastUpdated,
      data: COMPETITION_RULES_A,
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    {
      id: 'doc_b',
      fileName: '02_IdeaX創星季_競賽網一般用戶服務條款.md',
      title: GENERAL_USER_TERMS_B.title,
      subtitle: GENERAL_USER_TERMS_B.subtitle,
      code: 'B',
      category: '會員服務條款',
      updatedAt: GENERAL_USER_TERMS_B.lastUpdated,
      data: GENERAL_USER_TERMS_B,
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    },
    {
      id: 'doc_c',
      fileName: '03_IdeaX創星季_參賽者自律切結與著作權約定.md',
      title: PARTICIPANT_TERMS_C.title,
      subtitle: PARTICIPANT_TERMS_C.subtitle,
      code: 'C',
      category: '參賽自律規範',
      updatedAt: PARTICIPANT_TERMS_C.lastUpdated,
      data: PARTICIPANT_TERMS_C,
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
    },
    {
      id: 'doc_d',
      fileName: '04_IdeaX創星季_產學專家審查委員聘約與保密條款.md',
      title: EXPERT_JUDGE_TERMS_D.title,
      subtitle: EXPERT_JUDGE_TERMS_D.subtitle,
      code: 'D',
      category: '專家評審聘約',
      updatedAt: EXPERT_JUDGE_TERMS_D.lastUpdated,
      data: EXPERT_JUDGE_TERMS_D,
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    },
    {
      id: 'doc_e',
      fileName: '05_IdeaX創星季_平台使用方法與操作指南.md',
      title: PLATFORM_GUIDE_E.title,
      subtitle: PLATFORM_GUIDE_E.subtitle,
      code: 'E',
      category: '平台實戰操作',
      updatedAt: PLATFORM_GUIDE_E.lastUpdated,
      data: PLATFORM_GUIDE_E,
      badgeColor: 'bg-stone-100 text-stone-900 border-stone-300',
    },
  ];

  const currentDoc = archivedDocuments.find((d) => d.id === selectedFileId) || archivedDocuments[0];

  // 一鍵產生全套打包 Markdown 文字
  const generateFullPackageMarkdown = () => {
    let md = `# IdeaX 創星季 • 官方競賽規章條款與辦法全套打包存檔\n`;
    md += `存檔時間：${new Date().toISOString()}\n`;
    md += `歸檔保管者：IdeaX 管理團隊 (${currentUser?.name || 'Admin'})\n`;
    md += `機密等級：管理員官方專用存檔\n\n`;
    md += `=======================================================\n\n`;

    archivedDocuments.forEach((doc, idx) => {
      md += `## 【文件 ${idx + 1}】${doc.title}\n`;
      md += `副標題：${doc.subtitle} | 版本代號：${doc.code} | 更新日期：${doc.updatedAt}\n\n`;

      if ('sections' in doc.data && Array.isArray((doc.data as any).sections)) {
        (doc.data as any).sections.forEach((sec: any) => {
          md += `### ${sec.title}（${sec.badge}）\n`;
          md += `摘要：${sec.summary}\n\n`;
          if (Array.isArray(sec.content)) {
            sec.content.forEach((line: string) => {
              md += `${line}\n`;
            });
          }
          md += `\n`;
        });
      } else if ('steps' in doc.data && Array.isArray((doc.data as any).steps)) {
        (doc.data as any).steps.forEach((st: any) => {
          md += `### 步驟 ${st.stepNumber}：${st.title}（${st.badge}）\n`;
          md += `${st.description}\n`;
          if (st.detail) md += `說明：${st.detail}\n`;
          if (st.action) md += `行動：${st.action}\n`;
          md += `\n`;
        });
      }
      md += `\n-------------------------------------------------------\n\n`;
    });

    return md;
  };

  // 複製全套歸檔
  const handleCopyFullPackage = () => {
    const text = generateFullPackageMarkdown();
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  // 下載打包 JSON
  const handleDownloadFullJson = () => {
    const packagePayload = {
      archiveTitle: 'IdeaX 創星季 全套競賽規章條款與辦法官方存檔包',
      archivedAt: new Date().toISOString(),
      archivedBy: currentUser?.name || 'IdeaX 管理團隊',
      documents: archivedDocuments.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        title: d.title,
        subtitle: d.subtitle,
        code: d.code,
        category: d.category,
        updatedAt: d.updatedAt,
        content: d.data,
      })),
    };

    const blob = new Blob([JSON.stringify(packagePayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IdeaX_創星季_全套規章條款存檔包_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden text-stone-900 text-left">
      {/* 📁 資料夾標題列（管理員專屬標籤） */}
      <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 p-4 sm:p-5 text-stone-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-950 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                創星季競賽規章與辦法官方存檔資料夾
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-950 text-amber-300 text-[10px] font-black tracking-wide">
                <Lock className="w-2.5 h-2.5" />
                <span>管理員限定・外人不公開</span>
              </span>
            </div>
            <p className="text-xs text-stone-900/80 font-medium mt-0.5">
              已將全賽程 5 大正式章程、用戶條款、參賽自律規範與評審聘約打包收納於此，供管理團隊內部存檔稽核。
            </p>
          </div>
        </div>

        {/* 右側一鍵打包按鈕組 */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyFullPackage}
            className="px-3 py-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
            title="一鍵複製全套規章 Markdown 格式"
          >
            {copiedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>已複製全套！</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>複製全套條款</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadFullJson}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
            title="一鍵下載全套規章 JSON 存檔包"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>已下載 JSON！</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>下載存檔包</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 資料夾內部檔案瀏覽介面：左側檔案樹 + 右側文件預覽 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
        {/* 左側：資料夾目錄索引清單 (5 大文件) */}
        <div className="lg:col-span-4 bg-stone-50/80 border-r border-stone-200/90 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-black text-stone-500 uppercase tracking-wider px-1">
            <span className="flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-amber-600" />
              <span>封存檔案列表（共 {archivedDocuments.length} 份）</span>
            </span>
            <span className="text-[10px] font-mono text-stone-400">TAR.GZ / JSON</span>
          </div>

          <div className="space-y-1.5">
            {archivedDocuments.map((doc) => {
              const isSelected = doc.id === selectedFileId;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedFileId(doc.id)}
                  className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-2.5 border ${
                    isSelected
                      ? 'bg-white border-amber-400 shadow-xs ring-2 ring-amber-400/20'
                      : 'bg-white/60 hover:bg-white border-stone-200/70 text-stone-700'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-mono font-black text-xs ${
                      isSelected
                        ? 'bg-amber-400 text-stone-950'
                        : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {doc.code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-stone-900 truncate">
                        {doc.title}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${doc.badgeColor}`}>
                        {doc.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 font-mono truncate mt-0.5">
                      📄 {doc.fileName}
                    </p>
                    <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-1 font-mono">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>版期：{doc.updatedAt}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 歸檔安全告示 */}
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-950 space-y-1">
            <div className="font-bold flex items-center gap-1 text-amber-900">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
              <span>官方內部治理存檔說明</span>
            </div>
            <p className="text-[10px] text-amber-800 leading-relaxed">
              本資料夾專供管理團隊備查官方競賽章程，一般參賽用戶僅於前端瀏覽精簡公告與賽程辦法，避免法規細節外洩或誤導。
            </p>
          </div>
        </div>

        {/* 右側：文件詳細內容檢閱器 */}
        <div className="lg:col-span-8 p-5 sm:p-7 space-y-5 overflow-y-auto max-h-[700px] bg-white">
          <div className="border-b border-stone-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-stone-900 text-amber-300 font-mono font-black text-xs">
                  DOC-{currentDoc.code}
                </span>
                <h3 className="text-base sm:text-lg font-black text-stone-950">
                  {currentDoc.title}
                </h3>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">{currentDoc.subtitle}</p>
            </div>
            <div className="text-xs text-stone-400 font-mono">
              更新日期：{currentDoc.updatedAt}
            </div>
          </div>

          {/* 文件章節內容展示 */}
          <div className="space-y-4">
            {'sections' in currentDoc.data && Array.isArray((currentDoc.data as any).sections) ? (
              (currentDoc.data as any).sections.map((sec: any) => (
                <div
                  key={sec.id}
                  className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-2 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-black text-stone-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span>{sec.title}</span>
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-800">
                      {sec.badge}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 font-bold bg-amber-50/70 p-2 rounded-xl border border-amber-200/50">
                    💡 摘要重點：{sec.summary}
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {Array.isArray(sec.content) &&
                      sec.content.map((paragraph: string, pIdx: number) => (
                        <p
                          key={pIdx}
                          className="text-xs text-stone-700 leading-relaxed font-sans pl-1"
                        >
                          {paragraph}
                        </p>
                      ))}
                  </div>
                </div>
              ))
            ) : 'steps' in currentDoc.data && Array.isArray((currentDoc.data as any).steps) ? (
              (currentDoc.data as any).steps.map((step: any) => (
                <div
                  key={step.stepNumber}
                  className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-black text-stone-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center font-mono">
                        {step.stepNumber}
                      </span>
                      <span>{step.title}</span>
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-800">
                      {step.badge}
                    </span>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed pl-8">
                    {step.description}
                  </p>
                  {step.action && (
                    <div className="text-[11px] text-amber-800 font-bold pl-8">
                      👉 建議操作：{step.action}
                    </div>
                  )}
                </div>
              ))
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
