import React, { useState } from 'react';
import { Question } from '../types';
import { useApp } from '../context/AppContext';
import {
  X,
  FileEdit,
  Tag,
  Trophy,
  Flame,
  Globe,
  Cpu,
  ImageIcon,
  MessageSquare,
  AlertCircle,
  Sparkles,
  Terminal,
  CheckCircle2,
} from 'lucide-react';
import { PainPointAutocompleteInput } from './PainPointAutocompleteInput';

interface UpdateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question;
  onSuccess?: (updatedQuestion: Question) => void;
}

export const UpdateProposalModal: React.FC<UpdateProposalModalProps> = ({
  isOpen,
  onClose,
  question,
  onSuccess,
}) => {
  const { updateProposalContent, questions } = useApp();

  const isVibeCoding = question.postType === 'vibecoding_app' || question.category === '網站程式';

  // 基本欄位狀態
  const [title, setTitle] = useState(question.title || '');
  const [description, setDescription] = useState(question.description || '');
  const [targetGoal, setTargetGoal] = useState(question.targetGoal || '');
  const [referencedPainPoint, setReferencedPainPoint] = useState(question.referencedPainPoint || '');

  // 軟體程式 (VibeCoding) 專屬欄位
  const [appName, setAppName] = useState(question.appName || (question as any).vibeCodingData?.appName || '');
  const [demoUrl, setDemoUrl] = useState(question.demoUrl || '');
  const [techArchitecture, setTechArchitecture] = useState(question.techArchitecture || '');
  const [coverImage, setCoverImage] = useState(question.coverImage || '');

  // 版本號碼（如果是 vibecoding 再加一個版本號碼，選填）
  const [version, setVersion] = useState<string>(question.currentVersion || '');

  // 更新日誌核心欄位
  // 1. 更新內容：每次更新要重新發布前的必填項目，未填無法發布
  const [updateContent, setUpdateContent] = useState<string>('');
  // 2. 提案者註記：選填
  const [updateNote, setUpdateNote] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!updateContent.trim()) {
      setFormError('「更新內容」為每次重新發布前之必填項目，未填無法發布！');
      return;
    }

    if (isVibeCoding && !appName.trim()) {
      setFormError('「作品名稱（軟體或網站名稱）」為必填項目！');
      return;
    }

    if (!title.trim()) {
      setFormError('標題不可為空！');
      return;
    }

    if (!description.trim()) {
      setFormError('內容說明不可為空！');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const result = updateProposalContent(question.id, {
      appName: isVibeCoding ? appName.trim() : undefined,
      title: title.trim(),
      description: description.trim(),
      targetGoal: targetGoal.trim() || undefined,
      referencedPainPoint: referencedPainPoint.trim() || undefined,
      demoUrl: isVibeCoding ? (demoUrl.trim() || undefined) : undefined,
      techArchitecture: isVibeCoding ? (techArchitecture.trim() || undefined) : undefined,
      coverImage: isVibeCoding ? (coverImage.trim() || undefined) : undefined,
      version: isVibeCoding ? (version.trim() || undefined) : undefined,
      updateContent: updateContent.trim(),
      updateNote: updateNote.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      if (onSuccess && result.updatedQuestion) {
        onSuccess(result.updatedQuestion);
      }
      onClose();
    } else {
      setFormError(result.message || '更新失敗，請檢查輸入內容！');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full my-6 p-5 sm:p-7 shadow-2xl border border-stone-200 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* 頂部標題 */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs ${
              isVibeCoding ? 'bg-purple-600' : 'bg-emerald-600'
            }`}>
              {isVibeCoding ? <Terminal className="w-5 h-5" /> : <FileEdit className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-stone-900 tracking-tight">
                  {isVibeCoding ? '更新軟體程式作品與發布日誌' : '更新解方提案內容與發布日誌'}
                </h3>
                {isVibeCoding && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    VibeCoding
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                每次更新重新發布前需填寫更新內容，以公開記錄透明的進展日誌
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-bold animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 🌟 核心一：更新日誌區塊（必填更新內容 + 選填註記 + 選填版本號） */}
          <div className="p-4 sm:p-4.5 rounded-2xl bg-gradient-to-br from-amber-50/80 via-purple-50/40 to-stone-50 border-2 border-amber-300 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>本次重新發布紀錄（將載於提案最下方更新日誌）</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                更新內容為必填
              </span>
            </div>

            {/* 1. 更新內容 (必填項目) */}
            <div>
              <label className="block text-xs font-bold text-stone-900 mb-1 flex items-center justify-between">
                <span>本次更新內容說明 <span className="text-rose-600 font-extrabold">* (必填)</span></span>
                <span className="text-[10px] text-stone-500">未填無法發布更新</span>
              </label>
              <textarea
                required
                rows={3}
                value={updateContent}
                onChange={(e) => {
                  setUpdateContent(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="請詳述本次更新了哪些功能、修復哪些問題、優化或新成果（例如：修復線上體驗網址、新增手機版適配、下載量已達 5,000 次並更新下一里程碑目標等）..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-stone-900 text-xs outline-none bg-white font-medium leading-relaxed"
              />
            </div>

            {/* 2. 提案者註記 (選填項目) */}
            <div>
              <label className="block text-xs font-bold text-stone-900 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                  <span>提案者註記 (選填)</span>
                </span>
                <span className="text-[10px] text-stone-400">作為日誌專屬重點備註</span>
              </label>
              <input
                type="text"
                value={updateNote}
                onChange={(e) => setUpdateNote(e.target.value)}
                placeholder="例如：重大架構重構 / 慶祝下載量達標里程碑 / 社群反饋緊急修正"
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-stone-900 text-xs outline-none bg-white font-medium"
              />
            </div>

            {/* 3. 如果是 vibecoding 再加一個版本號碼 (選填) */}
            {isVibeCoding && (
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-600" />
                    <span>版本號碼 (選填)</span>
                  </label>
                  <span className="text-[10px] text-purple-700 font-bold">VibeCoding 專屬版本標籤</span>
                </div>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="例如：v1.1.0、v2.0.0 (留空則維持原版本)"
                  className="w-full px-3.5 py-2 rounded-xl border border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-stone-900 text-xs outline-none bg-white font-mono"
                />
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-stone-400">快速填入：</span>
                  {['v1.0.1', 'v1.1.0', 'v1.2.0', 'v2.0.0'].map((ver) => (
                    <button
                      key={ver}
                      type="button"
                      onClick={() => setVersion(ver)}
                      className="px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-800 text-[10px] font-mono font-bold border border-purple-200 cursor-pointer transition-colors"
                    >
                      {ver}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 🌟 核心二：提案/作品內容更新 */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3.5">
            <h4 className="text-xs font-black text-stone-800 border-b border-stone-200 pb-2">
              提案與作品內容修改
            </h4>

            {/* 作品名稱（軟體或網站名稱） */}
            {isVibeCoding && (
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center justify-between">
                  <span>作品名稱（軟體或網站名稱） *</span>
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-1.5 py-0.2 rounded">
                    藍色顯示於卡片左下角
                  </span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="例如：ReceiptSnap AI、VibeForm AI..."
                  className="w-full px-3.5 py-2 rounded-xl border border-blue-300 focus:border-blue-500 text-stone-900 text-xs font-bold outline-none bg-white"
                />
              </div>
            )}

            {/* 標題 */}
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {isVibeCoding ? '應用標題 / 核心功能亮點 *' : '提案標題 / 創新主題 *'}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:border-stone-500 text-stone-900 text-xs font-bold outline-none bg-white"
              />
            </div>

            {/* 內容說明 */}
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {isVibeCoding ? '作品簡介與特色說明 *' : '提案內容與創新亮點說明 *'}
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:border-stone-500 text-stone-900 text-xs outline-none bg-white leading-relaxed"
              />
            </div>

            {/* 引用相關痛點與希望達成的目標 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-stone-800 font-bold mb-1 flex items-center gap-1.5 text-xs">
                  <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>引用相關痛點 (選填)</span>
                </label>
                <PainPointAutocompleteInput
                  value={referencedPainPoint}
                  onChange={(val) => setReferencedPainPoint(val)}
                  questions={questions}
                  placeholder="輸入關鍵字自動搜尋公開痛點"
                />
              </div>

              <div>
                <label className="block text-stone-800 font-bold mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>［希望達成的目標］ (選填)</span>
                  </span>
                  {isVibeCoding && (
                    <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.2 rounded">
                      下載量 / 里程碑
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={targetGoal}
                  onChange={(e) => setTargetGoal(e.target.value)}
                  placeholder={
                    isVibeCoding
                      ? '例如：希望 6 個月內達成 50,000 次下載量，並累積 5,000 位活躍用戶'
                      : '例: 於 6 個月內完成 POC 實證並獲得 100 位企業付費用戶'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-500 text-stone-900 text-xs outline-none bg-white font-medium"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  {isVibeCoding
                    ? '💡 目標說明：例如「希望 6 個月達成 ××× 下載次數」或累積活躍用戶數、產品留存率等具體可衡量成果。'
                    : '💡 目標說明：填寫短期至中期預期驗證成果、商業合作或驗證指標。'}
                </p>
              </div>
            </div>

            {/* VibeCoding 專屬：線上網址、技術架構、封面圖 */}
            {isVibeCoding && (
              <div className="space-y-3 pt-2 border-t border-stone-200">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>網站網址或線上體驗 Demo 連結</span>
                  </label>
                  <input
                    type="url"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    placeholder="https://my-app.vercel.app 或 GitHub 專案"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 outline-none bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-600" />
                    <span>技術架構 (Front-end / Back-end / AI 工具)</span>
                  </label>
                  <input
                    type="text"
                    value={techArchitecture}
                    onChange={(e) => setTechArchitecture(e.target.value)}
                    placeholder="例如：React + Vite + Tailwind + Firebase + Gemini API"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 outline-none bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                    <span>作品封面大圖 URL</span>
                  </label>
                  <input
                    type="url"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 outline-none bg-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 底部按鈕 */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-100">
            <span className="text-[11px] text-stone-400">
              * 更新後將同步寫入資料庫並於提案最底部顯示更新日誌
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-bold transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !updateContent.trim()}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isVibeCoding
                    ? 'bg-purple-600 hover:bg-purple-500 active:bg-purple-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>發布更新日誌與內容</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
