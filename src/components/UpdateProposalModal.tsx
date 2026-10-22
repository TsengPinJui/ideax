import React, { useState, useEffect } from 'react';
import { PublishedPlatformsPicker, normalizePlatforms } from './PublishedPlatforms';
import type { PublishedPlatform } from '../types';
import { Question, VIBECODING_CATEGORIES, InnovationProgressStage, INNOVATION_PROGRESS_STAGES } from '../types';
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
  Upload,
  Play,
  Video,
  Images,
  Crop,
  Bookmark,
  Save,
  FileText,
} from 'lucide-react';
import { ImageCropperModal, CropAspectRatio } from './common/ImageCropperModal';
import { PublishEffectPreviewModal } from './PublishEffectPreviewModal';
import { extractYoutubeVideoId, getYoutubeThumbnailUrl } from '../utils/youtubeUtils';
import {
  processUploadedImageFile,
  MAX_IMAGE_FILE_SIZE_MB,
  ACCEPTED_IMAGE_TYPES,
} from '../utils/imageUploadUtils';
import { MindMapEditor } from './mindmap/MindMapEditor';
import { sanitizeMindMap } from './mindmap/mindMapUtils';
import type { MindMapData } from '../types';
import { ProjectPlanExportButton } from './ProjectPlanExportButton';

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
  const { currentUser, updateProposalContent, openAboutModal, showCenterToast } = useApp();
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
  const [mindMap, setMindMap] = useState<MindMapData | null>(question.mindMap || null);
  const [demoUrl, setDemoUrl] = useState(question.demoUrl || question.externalLink || question.vibeCodingData?.demoUrl || '');
  const [fileLink, setFileLink] = useState(question.fileLink || question.externalLink || question.fileUrl || '');
  const [previewMode, setPreviewMode] = useState<'embed' | 'external'>(
    question.previewMode || ((question.demoUrl || question.externalLink || question.vibeCodingData?.demoUrl) ? 'embed' : 'external')
  );
  const [techArchitecture, setTechArchitecture] = useState(question.techArchitecture || '');
  const [publishedPlatforms, setPublishedPlatforms] = useState<PublishedPlatform[]>(() => normalizePlatforms(question.publishedPlatforms));
  const [coverImage, setCoverImage] = useState(question.coverImage || question.vibeCodingData?.coverImageUrl || '');
  const [galleryImages, setGalleryImages] = useState<string[]>(
    question.galleryImages || question.vibeCodingData?.screenshots || []
  );
  const [youtubeUrl, setYoutubeUrl] = useState(question.youtubeUrl || question.vibeCodingData?.youtubeUrl || '');
  const [coverMode, setCoverMode] = useState<'custom_image' | 'youtube_video'>(
    question.coverMode || question.vibeCodingData?.coverMode || 'custom_image'
  );
  const [cardHoverMode, setCardHoverMode] = useState<'video_autoplay' | 'image_carousel'>(
    question.cardHoverMode || question.vibeCodingData?.cardHoverMode || 'video_autoplay'
  );
  const [proposalProgressStage, setProposalProgressStage] = useState<InnovationProgressStage | string>(
    question.proposalProgressStage || ''
  );
  const [showCardImage, setShowCardImage] = useState<boolean>(question.showCardImage !== false);
  const [selectedCardImage, setSelectedCardImage] = useState<string>(question.cardDisplayImage || '');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // 圖片裁切器狀態 (支援 16:9, 4:3, 3:2, 1:1, 9:16, 2:1, 自由比例)
  const [cropperModalOpen, setCropperModalOpen] = useState(false);
  const [cropperTarget, setCropperTarget] = useState<'cover' | 'gallery'>('cover');
  const [cropperImageSrc, setCropperImageSrc] = useState<string>('');
  const [cropperInitialRatio, setCropperInitialRatio] = useState<CropAspectRatio>('16:9');
  const [pendingGalleryQueue, setPendingGalleryQueue] = useState<string[]>([]);

  // 草稿暫存狀態
  const draftStorageKey = `ideax_proposal_update_draft_${question.id}_${currentUser?.id || 'user'}`;
  const [detectedDraft, setDetectedDraft] = useState<any | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedDraftTime, setLastSavedDraftTime] = useState<string | null>(null);

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
      setMindMap(question.mindMap || null);
      setDemoUrl(question.demoUrl || question.externalLink || question.vibeCodingData?.demoUrl || '');
      setFileLink(question.fileLink || question.externalLink || question.fileUrl || '');
      setPreviewMode(
        question.previewMode || ((question.demoUrl || question.externalLink || question.vibeCodingData?.demoUrl) ? 'embed' : 'external')
      );
      setTechArchitecture(question.techArchitecture || '');
      setPublishedPlatforms(normalizePlatforms(question.publishedPlatforms));
      setCoverImage(question.coverImage || question.vibeCodingData?.coverImageUrl || '');
      setGalleryImages(question.galleryImages || question.vibeCodingData?.screenshots || []);
      setYoutubeUrl(question.youtubeUrl || question.vibeCodingData?.youtubeUrl || '');
      setCoverMode(question.coverMode || question.vibeCodingData?.coverMode || 'custom_image');
      setCardHoverMode(question.cardHoverMode || question.vibeCodingData?.cardHoverMode || 'video_autoplay');
      setProposalProgressStage(question.proposalProgressStage || '');
      setShowCardImage(question.showCardImage !== false);
      setSelectedCardImage(question.cardDisplayImage || '');
      setVersion(getNextVersion());
      setChangelogContent('');
      setChangelogNote('');
      setError('');
      setSubmitting(false);

      // 檢查是否有未發布更新草稿
      try {
        const raw = localStorage.getItem(draftStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.updatedAt) {
            setDetectedDraft(parsed);
          }
        }
      } catch {}
    }
  }, [isOpen, question.id, draftStorageKey]);

  if (!isOpen) return null;

  const handleApplyDraft = (draft: any) => {
    if (!draft) return;
    if (draft.appName !== undefined) setAppName(draft.appName);
    if (draft.title !== undefined) setTitle(draft.title);
    if (draft.description !== undefined) setDescription(draft.description);
    if (draft.selectedCategories !== undefined) setSelectedCategories(draft.selectedCategories);
    if (draft.referencedPainPoint !== undefined) setReferencedPainPoint(draft.referencedPainPoint);
    if (draft.targetGoal !== undefined) setTargetGoal(draft.targetGoal);
    if (draft.mindMap !== undefined) setMindMap(draft.mindMap);
    if (draft.demoUrl !== undefined) setDemoUrl(draft.demoUrl);
    if (draft.fileLink !== undefined) setFileLink(draft.fileLink);
    if (draft.previewMode !== undefined) setPreviewMode(draft.previewMode);
    if (draft.techArchitecture !== undefined) setTechArchitecture(draft.techArchitecture);
    if (draft.publishedPlatforms !== undefined) setPublishedPlatforms(draft.publishedPlatforms);
    if (draft.coverImage !== undefined) setCoverImage(draft.coverImage);
    if (draft.galleryImages !== undefined) setGalleryImages(draft.galleryImages);
    if (draft.youtubeUrl !== undefined) setYoutubeUrl(draft.youtubeUrl);
    if (draft.coverMode !== undefined) setCoverMode(draft.coverMode);
    if (draft.cardHoverMode !== undefined) setCardHoverMode(draft.cardHoverMode);
    if (draft.proposalProgressStage !== undefined) setProposalProgressStage(draft.proposalProgressStage);
    if (draft.showCardImage !== undefined) setShowCardImage(draft.showCardImage);
    if (draft.selectedCardImage !== undefined) setSelectedCardImage(draft.selectedCardImage);
    if (draft.version !== undefined) setVersion(draft.version);
    if (draft.changelogContent !== undefined) setChangelogContent(draft.changelogContent);
    if (draft.changelogNote !== undefined) setChangelogNote(draft.changelogNote);
    setDetectedDraft(null);
    showCenterToast('草稿已成功載入！', '已還原您之前填寫的更新內容', { type: 'success', duration: 2500 });
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {}
    setDetectedDraft(null);
  };

  const handleSaveDraft = () => {
    setIsSavingDraft(true);
    const draftData = {
      questionId: question.id,
      userId: currentUser?.id,
      appName,
      title,
      description,
      selectedCategories,
      referencedPainPoint,
      targetGoal,
      mindMap,
      demoUrl,
      fileLink,
      previewMode,
      techArchitecture,
      publishedPlatforms,
      coverImage,
      galleryImages,
      youtubeUrl,
      coverMode,
      cardHoverMode,
      proposalProgressStage,
      showCardImage,
      selectedCardImage,
      version,
      changelogContent,
      changelogNote,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(draftStorageKey, JSON.stringify(draftData));
    } catch (e) {
      console.error(e);
    }
    const timeStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    setLastSavedDraftTime(timeStr);
    setIsSavingDraft(false);
    showCenterToast('草稿已儲存！', `儲存時間：${timeStr}，下次開啟可載入繼續編輯。`, { type: 'success', duration: 2500 });
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setIsUploadingImage(true);
    const res = await processUploadedImageFile(file, MAX_IMAGE_FILE_SIZE_MB);
    setIsUploadingImage(false);
    if (!res.ok || !res.dataUrl) {
      setError(res.error || '圖片上傳失敗');
      return;
    }
    setCropperTarget('cover');
    setCropperImageSrc(res.dataUrl);
    setCropperInitialRatio('16:9');
    setCropperModalOpen(true);
  };

  const handleCropExistingCover = () => {
    if (!coverImage) return;
    setCropperTarget('cover');
    setCropperImageSrc(coverImage);
    setCropperInitialRatio('16:9');
    setCropperModalOpen(true);
  };

  const handleGalleryFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files || files.length === 0) return;
    setError('');
    const remainingSlots = 6 - galleryImages.length;
    if (remainingSlots <= 0) {
      setError('最多可上傳 6 張展示圖片');
      return;
    }
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    setIsUploadingImage(true);
    const uploadedList: string[] = [];
    for (const file of filesToProcess) {
      const res = await processUploadedImageFile(file, MAX_IMAGE_FILE_SIZE_MB);
      if (!res.ok || !res.dataUrl) {
        setError(res.error || '圖片上傳失敗');
      } else {
        uploadedList.push(res.dataUrl);
      }
    }
    setIsUploadingImage(false);
    if (uploadedList.length > 0) {
      const [first, ...rest] = uploadedList;
      setPendingGalleryQueue(rest);
      setCropperTarget('gallery');
      setCropperImageSrc(first);
      setCropperInitialRatio('16:9');
      setCropperModalOpen(true);
    }
  };

  const handleCropperConfirm = (croppedDataUrl: string) => {
    if (cropperTarget === 'cover') {
      setCoverImage(croppedDataUrl);
      setCropperModalOpen(false);
      setCropperImageSrc('');
    } else {
      setGalleryImages((prev) => {
        const next = [...prev, croppedDataUrl];
        if (!selectedCardImage && next.length > 0) {
          setSelectedCardImage(next[0]);
        }
        return next.slice(0, 6);
      });
      if (pendingGalleryQueue.length > 0) {
        const [nextImage, ...remaining] = pendingGalleryQueue;
        setPendingGalleryQueue(remaining);
        setCropperImageSrc(nextImage);
        setCropperInitialRatio('16:9');
      } else {
        setCropperModalOpen(false);
        setCropperImageSrc('');
      }
    }
  };

  const handleCropperSkip = () => {
    if (cropperTarget === 'cover') {
      setCoverImage(cropperImageSrc);
      setCropperModalOpen(false);
      setCropperImageSrc('');
    } else {
      setGalleryImages((prev) => {
        const next = [...prev, cropperImageSrc];
        if (!selectedCardImage && next.length > 0) {
          setSelectedCardImage(next[0]);
        }
        return next.slice(0, 6);
      });
      if (pendingGalleryQueue.length > 0) {
        const [nextImage, ...remaining] = pendingGalleryQueue;
        setPendingGalleryQueue(remaining);
        setCropperImageSrc(nextImage);
        setCropperInitialRatio('16:9');
      } else {
        setCropperModalOpen(false);
        setCropperImageSrc('');
      }
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      // 關鍵防護：若處於輸入法組字選字中（IME isComposing），阻止意外觸發送出
      if ((e.nativeEvent as any)?.isComposing) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
    }
    setError('');

    if (!title.trim()) {
      setError('請填寫標題');
      return;
    }
    if (!description.trim()) {
      setError('請填寫內容說明');
      return;
    }
    if (!isVibeCoding && !proposalProgressStage) {
      setError('【創新提案】請勾選目前提案的完程度［初步構想(0~2)、正在計畫(3~6)、實行中(7~9)、已完成(10)、成功驗證,持續精進 (11 up)］（必填）');
      return;
    }
    if (!changelogContent.trim()) {
      setError('請填寫本次版本的「更新摘要」（必填，將顯示於版本更新紀錄）');
      return;
    }

    const summaryText = changelogContent.trim();

    setSubmitting(true);
    const res = updateProposalContent(question.id, {
      appName: isVibeCoding ? appName.trim() : undefined,
      title: title.trim(),
      description: description.trim(),
      subcategory: isVibeCoding ? (selectedCategories[0] || '網站程式') : undefined,
      subcategories: isVibeCoding ? selectedCategories : undefined,
      referencedPainPoint: referencedPainPoint.trim(),
      targetGoal: targetGoal.trim(),
      // 心智圖：關掉或清空時存 null（移除）
      mindMap: (question.postType === 'innovation_proposal' || isVibeCoding) ? sanitizeMindMap(mindMap) : undefined,
      demoUrl: demoUrl.trim() || (isVibeCoding ? fileLink.trim() : ''),
      externalLink: isVibeCoding ? (fileLink.trim() || demoUrl.trim()) : undefined,
      previewMode: isVibeCoding ? previewMode : undefined,
      fileLink: fileLink.trim(),
      techArchitecture: techArchitecture.trim(),
      ...(isVibeCoding ? { publishedPlatforms: normalizePlatforms(publishedPlatforms) } : {}),
      coverImage: coverImage.trim(),
      galleryImages,
      youtubeUrl: youtubeUrl.trim(),
      coverMode,
      cardHoverMode,
      showCardImage,
      cardDisplayImage: showCardImage ? (selectedCardImage || (galleryImages.length > 0 ? galleryImages[0] : coverImage.trim()) || undefined) : undefined,
      proposalProgressStage: !isVibeCoding ? (proposalProgressStage || undefined) : undefined,
      version: version.trim() || undefined,
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

    // 發布成功後清除草稿
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {}

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="暫存目前編輯內容為草稿"
            >
              <Save className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isSavingDraft ? '儲存中...' : '儲存草稿'}</span>
            </button>
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
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            // 關鍵防護：若處於輸入法組字選字中（IME isComposing）或在單行 input 按 Enter，阻止意外觸發表單送出以防選字中斷
            if (e.key === 'Enter') {
              if ((e.nativeEvent as any)?.isComposing) return;
              const target = e.target as HTMLElement;
              if (target && target.tagName === 'INPUT' && target.getAttribute('type') !== 'submit') {
                e.preventDefault();
              }
            }
          }}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* 草稿偵測橫幅 */}
            {detectedDraft && (
              <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-amber-950 truncate">
                      偵測到您上次有未儲存的更新草稿
                    </p>
                    <p className="text-[11px] text-amber-700">
                      上次編輯於 {new Date(detectedDraft.updatedAt).toLocaleDateString('zh-TW')} {new Date(detectedDraft.updatedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleApplyDraft(detectedDraft)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-all cursor-pointer shadow-xs"
                  >
                    載入草稿
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="px-2.5 py-1.5 rounded-lg hover:bg-amber-100 text-stone-600 text-xs font-semibold transition-all cursor-pointer"
                  >
                    捨棄
                  </button>
                </div>
              </div>
            )}

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
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                    <span>
                      更新摘要 <span className="text-rose-600">*</span>
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700">
                      必填 · 顯示於版本更新紀錄
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    value={changelogContent}
                    onChange={(e) => setChangelogContent(e.target.value)}
                    placeholder="例如：修正手機版排版、新增匯出功能"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-900 focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                  <span>內容詳述（選填）</span>
                  <span className="text-[10px] font-medium text-stone-500">
                    於版本下預設收合，可點擊展開顯示
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={changelogNote}
                  onChange={(e) => setChangelogNote(e.target.value)}
                  placeholder="詳細說明本次版本的更新細節、修正項目或架構調整（選填，讀者可於版本紀錄下方點擊展開查看）..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-900 focus:border-emerald-600 outline-none resize-none"
                />
              </div>
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

            {/* 創新提案：要求勾選完程度（必填） */}
            {!isVibeCoding && (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/90 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>完程度 *</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                      必選勾選
                    </span>
                  </label>
                  <span className="text-[11px] text-emerald-800 font-medium">
                    請勾選最符合您提案的完程度階段
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {INNOVATION_PROGRESS_STAGES.map((stageItem) => {
                    const isChecked = proposalProgressStage === stageItem.id || proposalProgressStage === stageItem.label;
                    return (
                      <button
                        key={stageItem.id}
                        type="button"
                        onClick={() => {
                          setProposalProgressStage(stageItem.id);
                          if (error) setError('');
                        }}
                        className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                          isChecked
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-200 font-black'
                            : 'bg-white hover:bg-emerald-50/80 text-stone-800 border-emerald-200 hover:border-emerald-400 font-bold'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-white border-white text-emerald-600'
                              : 'border-stone-300 bg-stone-50 text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                        <span className="text-xs leading-snug">{stageItem.label}</span>
                      </button>
                    );
                  })}
                </div>
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
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-800 focus:border-emerald-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  期望目標 / 欲達到的改善效果
                </label>
                <input
                  type="text"
                  value={targetGoal}
                  onChange={(e) => setTargetGoal(e.target.value)}
                  placeholder="例如：希望能解決人工流程易出錯問題，達到作業時間縮短 50% 與零錯單的改善效果"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-800 focus:border-emerald-600 outline-none"
                />
              </div>
            </div>

            {/* 心智圖（選填） */}
            {(question.postType === 'innovation_proposal' || isVibeCoding) && (
              <MindMapEditor value={mindMap} onChange={setMindMap} title={title} kind={isVibeCoding ? 'vibecoding' : 'proposal'} />
            )}

            {/* URLs & Tech Stack */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  {isVibeCoding ? '嵌入預覽網址 / 作品網站連結' : '網站連結 (Demo URL)'}
                </label>
                <input
                  type="url"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  placeholder="https://my-app.vercel.app、https://my-app.streamlit.app"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-800 focus:border-emerald-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {isVibeCoding ? '外部連結 / 原始碼或相關檔案' : '原始碼或相關檔案連結'}
                </label>
                <input
                  type="url"
                  value={fileLink}
                  onChange={(e) => setFileLink(e.target.value)}
                  placeholder="https://github.com/... 或外部網站連結"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-800 focus:border-emerald-600 outline-none"
                />
              </div>
            </div>

            {isVibeCoding && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 cursor-pointer transition-colors select-none">
                <input
                  type="checkbox"
                  checked={previewMode === 'embed'}
                  onChange={(e) => setPreviewMode(e.target.checked ? 'embed' : 'external')}
                  className="mt-0.5 w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                />
                <div className="text-xs leading-relaxed flex-1">
                  <div className="font-bold text-indigo-950 flex items-center gap-1.5 flex-wrap">
                    <span>
                      開放內嵌網頁互動預覽（已閱讀並同意
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openAboutModal?.('questioner_terms');
                        }}
                        className="text-indigo-700 hover:text-indigo-950 underline mx-0.5 cursor-pointer"
                      >
                        《提問會員服務條款》
                      </button>
                      與
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openAboutModal?.('general_terms');
                        }}
                        className="text-indigo-700 hover:text-indigo-950 underline mx-0.5 cursor-pointer"
                      >
                        《一般服務條款》
                      </button>
                      ，勾選即同意開放用戶在內嵌網頁互動）
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${previewMode === 'embed' ? 'bg-indigo-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                      {previewMode === 'embed' ? '內嵌互動模式' : '外部開啟模式'}
                    </span>
                  </div>
                  <p className="text-stone-500 mt-0.5">
                    勾選代表您已確認擁有該外部網頁之合法授權並負完全法律責任，將於作品介紹區顯示 iframe 互動預覽（若未單獨填寫嵌入預覽網址，將自動沿用外部連結網址）；若取消勾選或網站禁止內嵌，則提供「在新分頁開啟」按鈕。
                  </p>
                </div>
              </label>
            )}

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
            {isVibeCoding && <PublishedPlatformsPicker value={publishedPlatforms} onChange={setPublishedPlatforms} />}

            {/* Cover & Gallery Images (僅創新提案與軟體作品支援圖片上傳，痛點不上傳圖片卡片一律文字顯示) */}
            {question.postType !== 'pain_point' && question.postType !== 'seek_solution' && (
              <div className="space-y-3 pt-2 border-t border-stone-200">
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>封面圖片上傳</span>
                  </label>
                  <span className="text-[10px] font-semibold text-indigo-700">
                    支援 JPG / PNG / WebP · 單張上限 {MAX_IMAGE_FILE_SIZE_MB}MB
                  </span>
                </div>
                <p className="mb-1.5 text-[11.5px] text-stone-500">建議 16:9，例如 1280×720 或 1920×1080 px；其他比例也會完整顯示，兩側以模糊底補滿。下方預覽就是卡片上的樣子。</p>

                {!coverImage.trim() ? (
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/40 text-indigo-800 text-xs font-bold cursor-pointer transition-all">
                    <Upload className="w-4 h-4 shrink-0" />
                    <span>
                      {isUploadingImage
                        ? '圖片處理中...'
                        : `點擊選擇圖片上傳封面（單張限 ${MAX_IMAGE_FILE_SIZE_MB}MB 以內）`}
                    </span>
                    <input
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES}
                      onChange={handleCoverFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden border border-stone-300 bg-stone-900 group">
                    <img src={coverImage} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-70" />
                    <img src={coverImage} alt="封面預覽" className="relative w-full h-full object-contain" />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCropExistingCover}
                        className="px-2.5 py-1 rounded bg-black/75 hover:bg-black text-white text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-colors"
                        title="裁切封面圖片"
                      >
                        <Crop className="w-3 h-3 text-amber-300" />
                        <span>裁切</span>
                      </button>
                      <label className="px-2.5 py-1 rounded bg-black/75 hover:bg-black text-white text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-colors">
                        <Upload className="w-3 h-3" />
                        <span>更換封面</span>
                        <input
                          type="file"
                          accept={ACCEPTED_IMAGE_TYPES}
                          onChange={handleCoverFileChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setCoverImage('')}
                        className="p-1.5 rounded bg-rose-600/90 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                        title="移除封面圖片"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                  <label className="text-xs font-bold text-stone-700">
                    畫面截圖與展示圖集（{galleryImages.length} / 6 張）
                  </label>
                  <span className="text-[10px] text-stone-500 font-semibold">
                    最多 6 張 · 每張上限 {MAX_IMAGE_FILE_SIZE_MB}MB
                  </span>
                </div>

                {galleryImages.length < 6 && (
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 mb-2 rounded-lg border border-dashed border-stone-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/40 text-stone-700 text-xs font-bold cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      {isUploadingImage
                        ? '圖片處理中...'
                        : `點擊上傳畫面截圖（還可上傳 ${6 - galleryImages.length} 張，單張限 ${MAX_IMAGE_FILE_SIZE_MB}MB）`}
                    </span>
                    <input
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES}
                      multiple
                      onChange={handleGalleryFilesChange}
                      className="hidden"
                    />
                  </label>
                )}

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

              {/* 可以選擇是否顯示圖片在卡片，可選擇一張 */}
              {(galleryImages.length > 0 || Boolean(coverImage.trim())) && (
                <div className="p-3.5 rounded-xl bg-white/95 border border-amber-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-black text-stone-900 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showCardImage}
                        onChange={(e) => setShowCardImage(e.target.checked)}
                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span>在卡片上顯示圖片（勾選啟用）</span>
                    </label>
                    <span className="text-[11px] text-stone-500">
                      {showCardImage ? '已啟用：可於下方點選 1 張作為卡片展示封面' : '已關閉：卡片將以文字詳述/AI摘要/熱門留言呈現'}
                    </span>
                  </div>

                  {showCardImage && (
                    <div>
                      <p className="text-[11px] text-stone-600 font-medium mb-1.5">
                        👉 點擊選擇其中 1 張作為卡片展示圖片：
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {(coverImage.trim() ? [coverImage.trim(), ...galleryImages] : galleryImages).map((img, idx) => {
                          const isChosen = (selectedCardImage ? selectedCardImage === img : idx === 0);
                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedCardImage(img)}
                              className={`relative group h-16 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                                isChosen
                                  ? 'border-amber-500 ring-2 ring-amber-400/50 shadow-md scale-102'
                                  : 'border-stone-200 opacity-70 hover:opacity-100 hover:border-amber-300'
                              }`}
                              title="點擊選定為卡片展示圖"
                            >
                              <img src={img} alt={`展示圖 ${idx + 1}`} className="w-full h-full object-cover" />
                              {isChosen && (
                                <span className="absolute bottom-1 inset-x-1 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-[9px] text-center shadow-xs">
                                  ★ 卡片展示
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

              {/* YouTube 介紹影片連結與卡片封面/懸停動態展示設定 */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-red-600" />
                      <span>YouTube 介紹影片連結 (選填)</span>
                    </label>
                    <span className="text-[10px] font-semibold text-stone-500">
                      公開播放於大卡片與內頁
                    </span>
                  </div>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setYoutubeUrl(val);
                      const vid = extractYoutubeVideoId(val);
                      if (vid && !coverImage.trim()) {
                        setCoverMode('youtube_video');
                        setCardHoverMode('video_autoplay');
                      }
                    }}
                    placeholder="例如：https://www.youtube.com/watch?v=... 或 https://youtu.be/..."
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-red-500 text-xs text-stone-900 outline-none bg-white font-mono"
                  />
                  {youtubeUrl.trim() && (
                    <div className="mt-1.5">
                      {extractYoutubeVideoId(youtubeUrl) ? (
                        <div className="inline-flex items-center gap-2 text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <img
                            src={getYoutubeThumbnailUrl(youtubeUrl) || ''}
                            alt="YouTube 縮圖"
                            className="w-10 h-6 object-cover rounded border border-emerald-300"
                          />
                          <span>✓ 已解析 YouTube 影片（ID: {extractYoutubeVideoId(youtubeUrl)}）</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-rose-600 font-bold">
                          ⚠️ 請輸入有效的 YouTube 影片網址
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-stone-200/80">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1.5">
                      1. 卡片靜態封面來源選擇
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCoverMode('custom_image')}
                        className={`px-2.5 py-2 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          coverMode === 'custom_image'
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>使用自訂封面</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoverMode('youtube_video')}
                        disabled={!extractYoutubeVideoId(youtubeUrl)}
                        className={`px-2.5 py-2 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 transition-all ${
                          !extractYoutubeVideoId(youtubeUrl)
                            ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                            : coverMode === 'youtube_video'
                            ? 'bg-red-600 text-white border-red-600 cursor-pointer'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-red-50 hover:text-red-700 cursor-pointer'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 shrink-0" />
                        <span>YouTube 當封面</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1.5">
                      2. 卡片瀏覽時（滑鼠移到卡片）動態展示
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCardHoverMode('video_autoplay')}
                        disabled={!extractYoutubeVideoId(youtubeUrl)}
                        className={`px-2.5 py-2 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 transition-all ${
                          !extractYoutubeVideoId(youtubeUrl)
                            ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                            : cardHoverMode === 'video_autoplay'
                            ? 'bg-red-600 text-white border-red-600 cursor-pointer'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-red-50 hover:text-red-700 cursor-pointer'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5 shrink-0" />
                        <span>滑鼠移到播影片</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardHoverMode('image_carousel')}
                        className={`px-2.5 py-2 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          cardHoverMode === 'image_carousel' || !extractYoutubeVideoId(youtubeUrl)
                            ? 'bg-amber-500 text-stone-950 border-amber-500'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-amber-50 hover:text-amber-800'
                        }`}
                      >
                        <Images className="w-3.5 h-3.5 shrink-0" />
                        <span>滑鼠移到圖片輪播</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          {/* Pinned Footer Actions */}
          <div className="px-5 py-3.5 border-t border-stone-200 bg-white shrink-0 space-y-2.5">
            {isVibeCoding && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>刊登前請再次確認網站與程式資料安全並符合法規。</span>
              </div>
            )}
            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2.5">
              {(question.postType === 'vibecoding_app' || question.postType === 'innovation_proposal') &&
                question.authorId === currentUser.id && !question.isSimulated && (
                  <ProjectPlanExportButton
                    project={{
                      id: question.id,
                      postType: question.postType,
                      title,
                      appName,
                      description,
                      referencedPainPoint,
                      targetGoal,
                      techArchitecture,
                      proposalProgressStage: String(proposalProgressStage || ''),
                      currentVersion: version,
                      category: question.category,
                      subcategory: selectedCategories[0] || question.subcategory,
                      tags: question.tags,
                      mindMap: sanitizeMindMap(mindMap),
                      publishedPlatforms,
                    }}
                  />
                )}
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
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="px-4 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="暫存目前編輯內容為草稿"
              >
                <Bookmark className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isSavingDraft ? '儲存中...' : '存為草稿'}</span>
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
          youtubeUrl={youtubeUrl}
          coverMode={coverMode}
          cardHoverMode={cardHoverMode}
          proposalProgressStage={proposalProgressStage || undefined}
          appName={appName}
          demoUrl={demoUrl || fileLink}
          externalLink={fileLink}
          previewMode={previewMode}
          techArchitecture={techArchitecture}
          referencedPainPoint={referencedPainPoint}
          targetGoal={targetGoal}
          currentVersion={version}
          selectedVibeCategories={selectedCategories}
          domainTrack={question.category || '資通訊'}
        />
      )}

      {/* 提案與作品圖片裁切器：支援 16:9, 4:3, 3:2, 1:1, 9:16, 2:1, 自由比例與建議尺寸 */}
      <ImageCropperModal
        isOpen={cropperModalOpen}
        imageSrc={cropperImageSrc}
        title={cropperTarget === 'cover' ? '裁切作品/提案封面（支援 16:9、4:3、1:1 等建議尺寸）' : '裁切展示截圖與圖片'}
        mode="proposal"
        initialAspectRatio={cropperInitialRatio}
        lockAspectRatio={false}
        cropShape="rect"
        outputMaxWidth={1920}
        onClose={() => {
          setCropperModalOpen(false);
          setCropperImageSrc('');
          setPendingGalleryQueue([]);
        }}
        onConfirm={handleCropperConfirm}
        onSkip={handleCropperSkip}
      />
    </div>
  );
};
