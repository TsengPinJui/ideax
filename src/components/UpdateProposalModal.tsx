import React, { useState, useEffect } from 'react';
import { Question, VIBECODING_CATEGORIES } from '../types';
import { useApp } from '../context/AppContext';
import { PainPointAutocompleteInput } from './PainPointAutocompleteInput';
import {
  X,
  FileEdit,
  Globe,
  Cpu,
  Target,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  GitBranch,
  Flame,
  Eye,
} from 'lucide-react';
import { PublishEffectPreviewModal } from './PublishEffectPreviewModal';

interface UpdateProposalModalProps {
  question: Question;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UpdateProposalModal: React.FC<UpdateProposalModalProps> = ({
  question,
  isOpen = true,
  onClose,
  onSuccess,
}) => {
  const { updateProposalContent } = useApp();
  const isVibeCoding = question.postType === 'vibecoding_app';

  const getInitialCats = () => {
    const raw =
      Array.isArray(question.subcategories) && question.subcategories.length > 0
        ? question.subcategories.filter((c) => (VIBECODING_CATEGORIES as readonly string[]).includes(c))
        : question.subcategory && (VIBECODING_CATEGORIES as readonly string[]).includes(question.subcategory)
        ? [question.subcategory]
        : ['網站程式'];
    return raw.length > 0 ? raw.slice(0, 3) : ['網站程式'];
  };

  const getNextVersion = () => {
    const cur = question.currentVersion || 'v1.0.0';
    const match = cur.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
    if (match) {
      return `v${match[1]}.${Number(match[2]) + 1}.0`;
    }
    return cur;
  };

  const [selectedCategories, setSelectedCategories] = useState<string[]>(getInitialCats);
  const [appName, setAppName] = useState(question.appName || question.vibeCodingData?.appName || '');
  const [title, setTitle] = useState(question.title || '');
  const [description, setDescription] = useState(question.description || '');
  const [referencedPainPoint, setReferencedPainPoint] = useState(question.referencedPainPoint || '');
  const [targetGoal, setTargetGoal] = useState(question.targetGoal || '');
  const [demoUrl, setDemoUrl] = useState(question.demoUrl || question.vibeCodingData?.demoUrl || '');
  const [fileLink, setFileLink] = useState(question.fileLink || question.fileUrl || '');
  const [techArchitecture, setTechArchitecture] = useState(question.techArchitecture || '');
  const [coverImage, setCoverImage] = useState(question.coverImage || question.vibeCodingData?.coverImageUrl || '');
  const [galleryImages, setGalleryImages] = useState<string[]>(
    question.galleryImages || question.vibeCodingData?.screenshots || []
  );
  const [newGalleryUrl, setNewGalleryUrl] = useState('');

  const [version, setVersion] = useState(getNextVersion);
  const [changelogContent, setChangelogContent] = useState('');
  const [changelogNote, setChangelogNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategories(getInitialCats());
      setAppName(question.appName || question.vibeCodingData?.appName || '');
      setTitle(question.title || '');
      setDescription(question.description || '');
      setReferencedPainPoint(question.referencedPainPoint || '');
      setTargetGoal(question.targetGoal || '');
      setDemoUrl(question.demoUrl || question.vibeCodingData?.demoUrl || '');
      setFileLink(question.fileLink || question.fileUrl || '');
      setTechArchitecture(question.techArchitecture || '');
      setCoverImage(question.coverImage || question.vibeCodingData?.coverImageUrl || '');
      setGalleryImages(question.galleryImages || question.vibeCodingData?.screenshots || []);
      setNewGalleryUrl('');
      setVersion(getNextVersion());
      setChangelogContent('');
      setChangelogNote('');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen, question.id]);

  if (!isOpen) return null;

  const handleAddGalleryImage = () => {
    const trimmed = newGalleryUrl.trim();
    if (!trimmed) return;
    if (galleryImages.length >= 6) {
      setError('最多可上傳 6 張展示圖片');
      return;
    }
    setGalleryImages([...galleryImages, trimmed]);
    setNewGalleryUrl('');
    setError('');
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('請填寫標題');
      return;
    }
    if (!description.trim()) {
      setError('請填寫內容說明');
      return;
    }

    const summaryText =
      changelogContent.trim() || (isVibeCoding ? '更新作品內容與資訊' : '更新提案內容說明');

    setSubmitting(true);
    const res = updateProposalContent(question.id, {
      appName: isVibeCoding ? appName.trim() : undefined,
      title: title.trim(),
      description: description.trim(),
      subcategory: isVibeCoding ? (selectedCategories[0] || '網站程式') : undefined,
      subcategories: isVibeCoding ? selectedCategories : undefined,
      referencedPainPoint: referencedPainPoint.trim(),
      targetGoal: targetGoal.trim(),
      demoUrl: demoUrl.trim(),
      fileLink: fileLink.trim(),
      techArchitecture: techArchitecture.trim(),
      coverImage: coverImage.trim(),
      galleryImages,
      version: isVibeCoding ? version.trim() : undefined,
      updateContent: summaryText,
      updateNote: changelogNote.trim() || undefined,
      changelogContent: summaryText,
      changelogNote: changelogNote.trim() || undefined,
    });

    setSubmitting(false);
    if (!res.success && !res.ok) {
      setError(res.message || res.reason || '更新失敗，請稍後再試');
      return;
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="bg-white rounded-xl border border-stone-200 shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                {isVibeCoding ? '更新作品內容與版本紀錄' : '更新提案內容'}
              </h3>
              <p className="text-xs text-stone-500">
                儲存後將自動寫入版本紀錄，方便讀者查看更新內容
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="關閉視窗"
            className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* Version & Changelog */}
            <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-emerald-600" />
                  本次版本更新說明
                </span>
                {question.currentVersion && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100/80 text-emerald-800">
                    目前版本：{question.currentVersion}
                  </span>
                )}
              </div>

              {isVibeCoding && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      新版本號
                    </label>
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="例如：v1.2.0"
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-900 focus:border-emerald-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      更新備註（選填）
                    </label>
                    <input
                      type="text"
                      value={changelogNote}
                      onChange={(e) => setChangelogNote(e.target.value)}
                      placeholder="例如：修正手機版排版、新增匯出功能"
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-900 focus:border-emerald-600 outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  更新內容摘要（若未填寫將自動帶入預設更新紀錄）
                </label>
                <textarea
                  rows={2}
                  value={changelogContent}
                  onChange={(e) => setChangelogContent(e.target.value)}
                  placeholder="簡短說明這次改了什麼（例如：新增多因素回測圖表、加快載入速度）"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-900 focus:border-emerald-600 outline-none resize-none"
                />
              </div>

              {!isVibeCoding && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    更新備註（選填）
                  </label>
                  <input
                    type="text"
                    value={changelogNote}
                    onChange={(e) => setChangelogNote(e.target.value)}
                    placeholder="例如：補充財務預算與執行時程"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-900 focus:border-emerald-600 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Software Categories (up to 3) */}
            {isVibeCoding && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-700">
                    軟體分類（最多選 3 個）*
                  </label>
                  <span className="text-[11px] font-semibold text-indigo-600">
                    已選 {selectedCategories.length} / 3
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {VIBECODING_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategories((prev) => {
                            if (prev.includes(cat)) {
                              if (prev.length <= 1) return prev;
                              return prev.filter((c) => c !== cat);
                            }
                            if (prev.length >= 3) return prev;
                            return [...prev, cat];
                          });
                        }}
                        className={`px-2.5 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50/40'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* App Name (for VibeCoding) */}
            {isVibeCoding && (
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  作品名稱
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="例如：NexSight洞鑑"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm font-semibold text-stone-900 focus:border-emerald-600 outline-none"
                />
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                標題 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm font-semibold text-stone-900 focus:border-emerald-600 outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                內容說明 *
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs sm:text-sm text-stone-800 leading-relaxed focus:border-emerald-600 outline-none"
              />
            </div>

            {/* Referenced Pain Point & Target Goal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  解決的痛點
                </label>
                <PainPointAutocompleteInput
                  value={referencedPainPoint}
                  onChange={setReferencedPainPoint}
                  placeholder="輸入關鍵字搜尋站內痛點..."
                  inputClassName="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-800 focus:border-emerald-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  期望目標
                </label>
                <input
                  type="text"
                  value={targetGoal}
                  onChange={(e) => setTargetGoal(e.target.value)}
                  placeholder="例如：希望達成 10,000 人次使用"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-800 focus:border-emerald-600 outline-none"
                />
              </div>
            </div>

            {/* URLs & Tech Stack */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  網站連結 (Demo URL)
                </label>
                <input
                  type="url"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-800 focus:border-emerald-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  原始碼或相關檔案連結
                </label>
                <input
                  type="url"
                  value={fileLink}
                  onChange={(e) => setFileLink(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-800 focus:border-emerald-600 outline-none"
                />
              </div>
            </div>

            {isVibeCoding && (
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                  技術架構
                </label>
                <input
                  type="text"
                  value={techArchitecture}
                  onChange={(e) => setTechArchitecture(e.target.value)}
                  placeholder="例如：React + TypeScript + Tailwind CSS + Gemini API"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-800 focus:border-emerald-600 outline-none"
                />
              </div>
            )}

            {/* Cover & Gallery Images */}
            <div className="space-y-3 pt-2 border-t border-stone-200">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  封面圖片網址
                </label>
                <input
                  type="text"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-800 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  畫面截圖（最多 6 張）
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newGalleryUrl}
                    onChange={(e) => setNewGalleryUrl(e.target.value)}
                    placeholder="貼上圖片網址後點選新增..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs text-stone-800 focus:border-emerald-600 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddGalleryImage}
                    className="px-3 py-1.5 rounded-lg border border-indigo-500 bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white active:bg-indigo-700 active:text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    新增
                  </button>
                </div>
                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {galleryImages.map((img, idx) => (
                      <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(idx)}
                          className="absolute top-1 right-1 p-1 rounded bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pinned Footer Actions */}
          <div className="px-5 py-3.5 border-t border-stone-200 bg-white shrink-0 space-y-2.5">
            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="px-4 py-2 rounded-lg border border-stone-300 bg-white text-stone-600 text-xs font-bold hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200 transition-colors cursor-pointer"
              >
                取消
              </button>

              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="px-4 py-2 rounded-lg border-2 border-indigo-500 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="預覽更新後的展示效果"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>預覽效果</span>
              </button>

              <button
                type="submit"
                disabled={submitting}
                onClick={() => handleSubmit()}
                className={`px-5 py-2 rounded-lg border-2 border-emerald-600 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  submitting
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-emerald-700 hover:bg-emerald-600 hover:text-white active:bg-emerald-700 active:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? '儲存發布中...' : '儲存並發布更新'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {showPreviewModal && (
        <PublishEffectPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          onConfirmPublish={() => {
            setShowPreviewModal(false);
            handleSubmit();
          }}
          isSubmitting={submitting}
          postType={isVibeCoding ? 'vibecoding_app' : 'innovation_proposal'}
          title={title}
          description={description}
          category={question.category}
          subcategory={selectedCategories[0] || question.subcategory}
          tags={question.tags}
          authorName={question.authorName || '創作者'}
          authorAvatar={question.authorAvatar}
          authorTitle={question.authorTitle}
          bounty={question.bounty}
          coverImage={coverImage}
          galleryImages={galleryImages}
          appName={appName}
          demoUrl={demoUrl || fileLink}
          techArchitecture={techArchitecture}
          referencedPainPoint={referencedPainPoint}
          targetGoal={targetGoal}
          currentVersion={version}
          selectedVibeCategories={selectedCategories}
          domainTrack={question.category || '資通訊'}
        />
      )}
    </div>
  );
};
