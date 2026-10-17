import React, { useState } from 'react';
import {
  ProposalContentSection,
} from '../../types/competition';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Bold,
  Palette,
  Image as ImageIcon,
  X,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Type,
  FileSpreadsheet,
} from 'lucide-react';
import {
  PROPOSAL_TEXT_COLOR_PALETTE,
  DEFAULT_PROPOSAL_SECTION_TEMPLATES,
} from '../../utils/proposalContentHelper';
import {
  processUploadedImageFile,
  MAX_IMAGE_FILE_SIZE_MB,
  ACCEPTED_IMAGE_TYPES,
} from '../../utils/imageUploadUtils';

interface ProposalSectionsEditorProps {
  sections: ProposalContentSection[];
  onChange: (sections: ProposalContentSection[]) => void;
  showToast?: (msg: string) => void;
}

export const ProposalSectionsEditor: React.FC<ProposalSectionsEditorProps> = ({
  sections,
  onChange,
  showToast,
}) => {
  const [activeImageUploadSectionId, setActiveImageUploadSectionId] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [imageCaptionInput, setImageCaptionInput] = useState<string>('');

  // 1. 新增空白段落
  const handleAddSection = () => {
    const newSec: ProposalContentSection = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `段落 ${sections.length + 1}：自訂標題`,
      titleSize: 'xl',
      titleBold: true,
      content: '',
      textColor: '#1c1917',
      isBold: false,
      images: [],
    };
    onChange([...sections, newSec]);
    showToast?.('已新增段落');
  };

  // 2. 載入標準企劃書模板
  const handleLoadTemplate = () => {
    if (sections.length > 0 && sections.some((s) => s.content.trim().length > 0)) {
      if (!window.confirm('載入標準範本將覆蓋目前填寫的段落內容，確定要載入嗎？')) {
        return;
      }
    }
    onChange(JSON.parse(JSON.stringify(DEFAULT_PROPOSAL_SECTION_TEMPLATES)));
    showToast?.('已載入標準企劃書三段式架構範本');
  };

  // 3. 刪除段落
  const handleRemoveSection = (sectionId: string) => {
    if (sections.length <= 1) {
      showToast?.('請至少保留一個段落');
      return;
    }
    onChange(sections.filter((s) => s.id !== sectionId));
    showToast?.('已刪除段落');
  };

  // 4. 移動段落
  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newSections.length) return;
    const temp = newSections[index];
    newSections[index] = newSections[targetIdx];
    newSections[targetIdx] = temp;
    onChange(newSections);
  };

  // 5. 更新單一段落屬性
  const updateSection = (sectionId: string, patch: Partial<ProposalContentSection>) => {
    onChange(
      sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s))
    );
  };

  // 6. 本地上傳插入大圖 (投影片/海報/照片，單張上限 2MB)
  const handleFileUploadForSection = async (sectionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const res = await processUploadedImageFile(file, MAX_IMAGE_FILE_SIZE_MB);
    if (!res.ok || !res.dataUrl) {
      showToast?.(res.error || '圖片上傳失敗');
      return;
    }

    insertImageIntoSection(sectionId, res.dataUrl, imageCaptionInput.trim() || file.name.replace(/\.[^/.]+$/, ''));
  };

  // 7. 插入圖片至指定段落
  const insertImageIntoSection = (sectionId: string, url: string, caption?: string) => {
    const targetSec = sections.find((s) => s.id === sectionId);
    if (!targetSec) return;

    const newImageItem = {
      id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      url,
      caption: caption || imageCaptionInput.trim() || '專案成果與架構圖',
    };

    updateSection(sectionId, {
      images: [...(targetSec.images || []), newImageItem],
    });

    setActiveImageUploadSectionId(null);
    setImageUrlInput('');
    setImageCaptionInput('');
    showToast?.('已在此段落成功上傳並插入圖片！');
  };

  // 8. 移除段落中的指定大圖
  const handleRemoveImageFromSection = (sectionId: string, imageId: string) => {
    const targetSec = sections.find((s) => s.id === sectionId);
    if (!targetSec) return;
    updateSection(sectionId, {
      images: (targetSec.images || []).filter((img) => img.id !== imageId),
    });
    showToast?.('已移除此張圖片');
  };

  // 9. 快速插入示範大圖（投影片/架構圖）
  const handleInsertSampleSlide = (sectionId: string) => {
    const sampleSlides = [
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80',
    ];
    const picked = sampleSlides[Math.floor(Math.random() * sampleSlides.length)];
    insertImageIntoSection(sectionId, picked, '提案簡報關鍵投影片與技術流程架構圖 (展示範例)');
  };

  return (
    <div className="space-y-5">
      {/* 頂部工具列 */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-stone-200">
        <div>
          <h4 className="font-black text-stone-900 text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>詳細內容或企畫書段落編輯（自訂多段落、標題、樣式與大圖）</span>
          </h4>
          <p className="text-[11px] text-stone-500 mt-0.5">
            您可以為提案規劃多個段落，自由設定標題字級、粗體、內文顏色，並在各段落內插入大圖（投影片、架構圖、海報、照片）。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadTemplate}
            className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            title="快速帶入競賽標準企劃書三段式架構"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
            <span>帶入標準三段式範本</span>
          </button>

          <button
            type="button"
            onClick={handleAddSection}
            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black transition-all cursor-pointer shadow-2xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增段落</span>
          </button>
        </div>
      </div>

      {/* 段落清單 */}
      <div className="space-y-4">
        {sections.map((sec, index) => (
          <div
            key={sec.id}
            className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-stone-200 hover:border-amber-300 transition-all space-y-3.5 shadow-2xs group"
          >
            {/* 段落頭部：順序與操作 */}
            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-stone-900 text-white font-mono text-xs font-black flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <span className="font-bold text-xs text-stone-700">
                  第 {index + 1} 段落
                </span>
              </div>

              {/* 段落控制：上移、下移、刪除 */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveSection(index, 'up')}
                  disabled={index === 0}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 disabled:opacity-30 cursor-pointer"
                  title="向上移動此段落"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveSection(index, 'down')}
                  disabled={index === sections.length - 1}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 disabled:opacity-30 cursor-pointer"
                  title="向下移動此段落"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveSection(sec.id)}
                  disabled={sections.length <= 1}
                  className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 cursor-pointer"
                  title="刪除此段落"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 段落標題自訂與標題樣式列 (粗體字、大字) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              <div className="sm:col-span-8">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  自訂段落標題 *
                </label>
                <input
                  type="text"
                  value={sec.title}
                  onChange={(e) => updateSection(sec.id, { title: e.target.value })}
                  placeholder={`例如: 一、創新技術架構與運作邏輯`}
                  className={`w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-amber-400 transition-colors ${
                    sec.titleBold ? 'font-black' : 'font-medium'
                  } ${
                    sec.titleSize === '2xl'
                      ? 'text-lg sm:text-xl'
                      : sec.titleSize === 'lg'
                      ? 'text-sm'
                      : 'text-base sm:text-lg'
                  }`}
                  required
                />
              </div>

              {/* 標題樣式選項：字級 (大字) 與 粗體開關 */}
              <div className="sm:col-span-4 flex items-center gap-2 pt-1 sm:pt-4">
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 flex-1">
                  <span className="text-[10px] text-stone-500 font-bold px-1">字級:</span>
                  {(['lg', 'xl', '2xl'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => updateSection(sec.id, { titleSize: sz })}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                        (sec.titleSize || 'xl') === sz
                          ? 'bg-amber-400 text-stone-950 shadow-2xs font-black'
                          : 'text-stone-600 hover:bg-white'
                      }`}
                    >
                      {sz === '2xl' ? '特大' : sz === 'xl' ? '大字' : '中字'}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => updateSection(sec.id, { titleBold: !sec.titleBold })}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-black cursor-pointer transition-all flex items-center gap-1 ${
                    sec.titleBold !== false
                      ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-2xs'
                      : 'bg-stone-100 border-stone-200 text-stone-500 hover:bg-stone-200'
                  }`}
                  title="標題粗體切換"
                >
                  <Bold className="w-3.5 h-3.5" />
                  <span>粗體</span>
                </button>
              </div>
            </div>

            {/* 文字顏色與內文粗體工具列 */}
            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-amber-600" />
                  <span>內文文字顏色：</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {PROPOSAL_TEXT_COLOR_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => updateSection(sec.id, { textColor: c.value })}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-all flex items-center justify-center border ${
                        (sec.textColor || '#1c1917') === c.value
                          ? 'ring-2 ring-amber-400 ring-offset-1 scale-110 border-stone-900'
                          : 'border-white hover:scale-105'
                      } ${c.bgClass}`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateSection(sec.id, { isBold: !sec.isBold })}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                    sec.isBold
                      ? 'bg-amber-300 border-amber-500 text-stone-950 font-black'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                  title="內文全部粗體切換"
                >
                  <Bold className="w-3.5 h-3.5" />
                  <span>內文粗體</span>
                </button>

                {/* 插入大圖開關 */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageUploadSectionId(
                      activeImageUploadSectionId === sec.id ? null : sec.id
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>插入大圖（投影片/海報）</span>
                </button>
              </div>
            </div>

            {/* 插入大圖面板 */}
            {activeImageUploadSectionId === sec.id && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-300 space-y-3 animate-in fade-in duration-100">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-700" />
                    <span>在此段落插入大圖 (投影片截圖、圖片說明、海報、照片)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveImageUploadSectionId(null)}
                    className="text-stone-400 hover:text-stone-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="block text-stone-700 font-bold">
                      選擇電腦或手機圖片上傳插入段落
                    </label>
                    <span className="text-[11px] font-semibold text-amber-800">
                      支援 JPG / PNG / WebP · 單張檔案大小上限 {MAX_IMAGE_FILE_SIZE_MB}MB
                    </span>
                  </div>
                  <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-xl bg-white hover:bg-amber-100/50 text-stone-800 font-bold cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-amber-700" />
                    <span>點擊選擇投影片、架構圖或照片檔案上傳（限 {MAX_IMAGE_FILE_SIZE_MB}MB 以內）...</span>
                    <input
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES}
                      onChange={(e) => handleFileUploadForSection(sec.id, e)}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-amber-200/60">
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={imageCaptionInput}
                      onChange={(e) => setImageCaptionInput(e.target.value)}
                      placeholder="圖片說明文字 (如: 圖一：系統動態需量反應架構簡報投影片)"
                      className="w-full bg-white border border-stone-200 rounded-xl p-2 text-stone-900 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInsertSampleSlide(sec.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-[11px] font-bold cursor-pointer"
                  >
                    帶入範例簡報投影片
                  </button>
                </div>
              </div>
            )}

            {/* 段落內已插入的大圖列表 */}
            {sec.images && sec.images.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold text-stone-700 flex items-center justify-between">
                  <span>本段落已插入之大圖與投影片 ({sec.images.length})：</span>
                  <span className="text-[10px] text-stone-400">大圖將於前台全寬清晰呈現</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sec.images.map((img, imgIdx) => (
                    <div
                      key={img.id}
                      className="rounded-xl border border-stone-200 bg-stone-50 overflow-hidden shadow-2xs group relative"
                    >
                      <div className="aspect-video w-full bg-stone-900/10 flex items-center justify-center overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.caption || `投影片 ${imgIdx + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="p-2 bg-white flex items-center justify-between gap-2 border-t border-stone-100">
                        <input
                          type="text"
                          value={img.caption || ''}
                          onChange={(e) => {
                            const newCaption = e.target.value;
                            updateSection(sec.id, {
                              images: (sec.images || []).map((m) =>
                                m.id === img.id ? { ...m, caption: newCaption } : m
                              ),
                            });
                          }}
                          placeholder="請輸入此圖片說明..."
                          className="w-full bg-transparent text-xs text-stone-800 font-medium focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImageFromSection(sec.id, img.id)}
                          className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                          title="刪除此圖片"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 段落內文文字編輯區 */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                段落詳細內容說明 *
              </label>
              <textarea
                rows={4}
                value={sec.content}
                onChange={(e) => updateSection(sec.id, { content: e.target.value })}
                style={{ color: sec.textColor || '#1c1917' }}
                placeholder="詳細陳述本段落之架構、實證數據、演算法流程、技術規格或商業落地時程..."
                className={`w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-amber-400 transition-colors leading-relaxed text-sm ${
                  sec.isBold ? 'font-bold' : 'font-normal'
                }`}
                required
              />
            </div>
          </div>
        ))}
      </div>

      {/* 底部新增段落按鈕 */}
      <button
        type="button"
        onClick={handleAddSection}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-100/50 text-stone-800 font-black text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4 text-amber-700" />
        <span>+ 新增自訂段落（可設定大字粗體標題、文字顏色與插入大圖）</span>
      </button>
    </div>
  );
};
