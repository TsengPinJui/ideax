import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Crop,
  RotateCw,
  FlipHorizontal,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Eye,
  Info,
  CheckCircle2,
} from 'lucide-react';

export type CropAspectRatio = '1:1' | '16:9' | '4:3' | '3:2' | '9:16' | '2:1' | 'free';

export interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  title?: string;
  mode?: 'avatar' | 'proposal' | 'cover' | 'general';
  initialAspectRatio?: CropAspectRatio;
  lockAspectRatio?: boolean;
  cropShape?: 'round' | 'rect';
  outputMaxWidth?: number;
  outputQuality?: number;
  onClose: () => void;
  onConfirm: (croppedDataUrl: string) => void;
  onSkip?: () => void;
}

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RatioPreset {
  key: CropAspectRatio;
  label: string;
  badge?: string;
  recommendedSize: string;
  description: string;
}

export const PROPOSAL_RATIO_PRESETS: RatioPreset[] = [
  {
    key: '16:9',
    label: '16:9',
    badge: '推薦封面',
    recommendedSize: '1280 × 720 px（或 1920 × 1080）',
    description: '提案首頁大圖、卡片主視覺與 VibeCoding 展示之黃金比例',
  },
  {
    key: '4:3',
    label: '4:3',
    badge: '經典展示',
    recommendedSize: '1200 × 900 px（或 800 × 600）',
    description: '經典簡報、成果展示與產品規格圖',
  },
  {
    key: '3:2',
    label: '3:2',
    badge: '專業攝影',
    recommendedSize: '1200 × 800 px',
    description: '實體商品實拍、單眼相機作品與設計集',
  },
  {
    key: '1:1',
    label: '1:1',
    badge: '正方形',
    recommendedSize: '1080 × 1080 px（或 800 × 800）',
    description: '正方縮圖、社群貼文與應用程式圖標',
  },
  {
    key: '9:16',
    label: '9:16',
    badge: '手機直式',
    recommendedSize: '1080 × 1920 px',
    description: '手機 App 實機畫面、直式海報與短影音截圖',
  },
  {
    key: '2:1',
    label: '2:1',
    badge: '超寬橫幅',
    recommendedSize: '1200 × 600 px',
    description: '專區頂部大橫幅與全寬 Banner 視覺',
  },
  {
    key: 'free',
    label: '自由比例',
    recommendedSize: '自訂像素尺寸',
    description: '不受長寬比限制，可任意拖曳裁切邊界',
  },
];

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  title,
  mode = 'general',
  initialAspectRatio,
  lockAspectRatio,
  cropShape,
  outputMaxWidth = 1600,
  outputQuality = 0.9,
  onClose,
  onConfirm,
  onSkip,
}) => {
  const isAvatar = mode === 'avatar';

  // 頭像必須正方形 1:1
  const effectiveLockAspectRatio = isAvatar ? true : Boolean(lockAspectRatio);
  const effectiveCropShape = isAvatar ? 'round' : cropShape || 'rect';
  const defaultRatio: CropAspectRatio = isAvatar ? '1:1' : initialAspectRatio || '16:9';

  const [aspectRatio, setAspectRatio] = useState<CropAspectRatio>(defaultRatio);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [showCirclePreview, setShowCirclePreview] = useState<boolean>(isAvatar);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // 原始圖形維度與當前容器換算
  const [imageSize, setImageSize] = useState<{ naturalWidth: number; naturalHeight: number }>({
    naturalWidth: 0,
    naturalHeight: 0,
  });
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number; left: number; top: number }>({
    width: 0,
    height: 0,
    left: 0,
    top: 0,
  });

  // 裁切框在 displaySize 內部座標
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, width: 100, height: 100 });
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  // 拖曳狀態
  const dragRef = useRef<{
    isDragging: boolean;
    dragType: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | null;
    startX: number;
    startY: number;
    startCrop: CropBox;
  }>({
    isDragging: false,
    dragType: null,
    startX: 0,
    startY: 0,
    startCrop: { x: 0, y: 0, width: 100, height: 100 },
  });

  // 數值換算比例
  const getRatioNumber = useCallback((ratio: CropAspectRatio): number | null => {
    switch (ratio) {
      case '1:1':
        return 1;
      case '16:9':
        return 16 / 9;
      case '4:3':
        return 4 / 3;
      case '3:2':
        return 3 / 2;
      case '9:16':
        return 9 / 16;
      case '2:1':
        return 2 / 1;
      case 'free':
      default:
        return null;
    }
  }, []);

  // 計算並初始化裁切框
  const initCropBox = useCallback(
    (displayWidth: number, displayHeight: number, ratio: CropAspectRatio) => {
      const targetRatio = getRatioNumber(ratio);
      const padding = 16;
      const availW = Math.max(40, displayWidth - padding * 2);
      const availH = Math.max(40, displayHeight - padding * 2);

      let w = availW;
      let h = availH;

      if (targetRatio !== null) {
        if (availW / availH > targetRatio) {
          w = availH * targetRatio;
          h = availH;
        } else {
          w = availW;
          h = availW / targetRatio;
        }
      } else {
        w = availW * 0.92;
        h = availH * 0.92;
      }

      const x = Math.max(0, (displayWidth - w) / 2);
      const y = Math.max(0, (displayHeight - h) / 2);
      setCropBox({ x, y, width: w, height: h });
    },
    [getRatioNumber]
  );

  // 圖片載入完成，計算展示大小與初次裁切框
  const handleImageLoad = () => {
    if (!imageRef.current || !containerRef.current) return;
    const img = imageRef.current;
    const nw = img.naturalWidth || 400;
    const nh = img.naturalHeight || 300;
    setImageSize({ naturalWidth: nw, naturalHeight: nh });

    const cw = containerRef.current.clientWidth || 500;
    const ch = containerRef.current.clientHeight || 400;

    const isSideways = rotation % 180 !== 0;
    const effectiveW = isSideways ? nh : nw;
    const effectiveH = isSideways ? nw : nh;

    const scale = Math.min((cw - 32) / effectiveW, (ch - 32) / effectiveH);
    const dw = Math.round(effectiveW * scale);
    const dh = Math.round(effectiveH * scale);
    const dl = Math.round((cw - dw) / 2);
    const dt = Math.round((ch - dh) / 2);

    setDisplaySize({ width: dw, height: dh, left: dl, top: dt });
    initCropBox(dw, dh, isAvatar ? '1:1' : defaultRatio);
  };

  // 當開啟時初始化
  useEffect(() => {
    if (!isOpen) return;
    setAspectRatio(isAvatar ? '1:1' : defaultRatio);
    setShowCirclePreview(isAvatar);
    setRotation(0);
    setFlipH(false);
  }, [isOpen, isAvatar, defaultRatio]);

  // 切換比例時重新計算裁切框
  const handleSelectRatio = (ratio: CropAspectRatio) => {
    if (isAvatar) return; // 頭像強制 1:1
    setAspectRatio(ratio);
    if (displaySize.width > 0 && displaySize.height > 0) {
      initCropBox(displaySize.width, displaySize.height, ratio);
    }
  };

  // 旋轉 90 度
  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  // 當 rotation 改變時重新計算容器適配
  useEffect(() => {
    if (!imageSize.naturalWidth || !containerRef.current) return;
    const cw = containerRef.current.clientWidth || 500;
    const ch = containerRef.current.clientHeight || 400;
    const isSideways = rotation % 180 !== 0;
    const effectiveW = isSideways ? imageSize.naturalHeight : imageSize.naturalWidth;
    const effectiveH = isSideways ? imageSize.naturalWidth : imageSize.naturalHeight;

    const baseScale = Math.min((cw - 32) / effectiveW, (ch - 32) / effectiveH);
    const dw = Math.round(effectiveW * baseScale);
    const dh = Math.round(effectiveH * baseScale);
    const dl = Math.round((cw - dw) / 2);
    const dt = Math.round((ch - dh) / 2);

    setDisplaySize({ width: dw, height: dh, left: dl, top: dt });
    initCropBox(dw, dh, isAvatar ? '1:1' : aspectRatio);
  }, [rotation, imageSize, aspectRatio, isAvatar, initCropBox]);

  // 當前真實換算的像素寬高 (輸出尺寸)
  const currentRealPixelSize = useMemo(() => {
    if (!imageSize.naturalWidth || displaySize.width <= 0) return { width: 0, height: 0 };
    const isSideways = rotation % 180 !== 0;
    const effectiveW = isSideways ? imageSize.naturalHeight : imageSize.naturalWidth;
    const effectiveH = isSideways ? imageSize.naturalWidth : imageSize.naturalHeight;
    const scaleX = effectiveW / displaySize.width;
    const scaleY = effectiveH / displaySize.height;
    return {
      width: Math.round(cropBox.width * scaleX),
      height: Math.round(cropBox.height * scaleY),
    };
  }, [cropBox, displaySize, imageSize, rotation]);

  // 產生即時預覽圖
  const updatePreview = useCallback(() => {
    if (!imageRef.current || displaySize.width <= 0 || cropBox.width <= 0) return;
    try {
      const img = imageRef.current;
      const isSideways = rotation % 180 !== 0;
      const effectiveW = isSideways ? img.naturalHeight : img.naturalWidth;
      const effectiveH = isSideways ? img.naturalWidth : img.naturalHeight;

      const scaleX = effectiveW / displaySize.width;
      const scaleY = effectiveH / displaySize.height;

      const realCropX = cropBox.x * scaleX;
      const realCropY = cropBox.y * scaleY;
      const realCropW = cropBox.width * scaleX;
      const realCropH = cropBox.height * scaleY;

      const previewCanvas = document.createElement('canvas');
      const pSize = 160;
      const pRatio = cropBox.width / cropBox.height;
      let pw = pSize;
      let ph = pSize;
      if (pRatio >= 1) {
        ph = Math.round(pSize / pRatio);
      } else {
        pw = Math.round(pSize * pRatio);
      }
      previewCanvas.width = pw;
      previewCanvas.height = ph;
      const pctx = previewCanvas.getContext('2d');
      if (!pctx) return;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = effectiveW;
      tempCanvas.height = effectiveH;
      const tctx = tempCanvas.getContext('2d');
      if (!tctx) return;

      tctx.save();
      tctx.translate(effectiveW / 2, effectiveH / 2);
      if (rotation !== 0) {
        tctx.rotate((rotation * Math.PI) / 180);
      }
      if (flipH) {
        tctx.scale(-1, 1);
      }
      tctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      tctx.restore();

      pctx.drawImage(tempCanvas, realCropX, realCropY, realCropW, realCropH, 0, 0, pw, ph);
      setPreviewDataUrl(previewCanvas.toDataURL('image/jpeg', 0.82));
    } catch {
      // 忽略暫態錯誤
    }
  }, [cropBox, displaySize, rotation, flipH]);

  useEffect(() => {
    const t = setTimeout(updatePreview, 60);
    return () => clearTimeout(t);
  }, [updatePreview]);

  // 處理游標與觸控移動
  const handlePointerDown = (
    e: React.PointerEvent,
    type: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      isDragging: true,
      dragType: type,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...cropBox },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging) return;
    e.preventDefault();

    const { dragType, startX, startY, startCrop } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const maxW = displaySize.width;
    const maxH = displaySize.height;
    const minSize = 36;
    const targetRatio = getRatioNumber(isAvatar ? '1:1' : aspectRatio);

    if (dragType === 'move') {
      const newX = Math.max(0, Math.min(maxW - startCrop.width, startCrop.x + dx));
      const newY = Math.max(0, Math.min(maxH - startCrop.height, startCrop.y + dy));
      setCropBox({
        ...startCrop,
        x: newX,
        y: newY,
      });
      return;
    }

    let { x, y, width, height } = startCrop;

    if (dragType === 'se') {
      let newW = Math.max(minSize, Math.min(maxW - x, startCrop.width + dx));
      let newH = Math.max(minSize, Math.min(maxH - y, startCrop.height + dy));
      if (targetRatio !== null) {
        if (newW / newH > targetRatio) {
          newW = Math.min(maxW - x, newH * targetRatio);
          newH = newW / targetRatio;
        } else {
          newH = Math.min(maxH - y, newW / targetRatio);
          newW = newH * targetRatio;
        }
      }
      width = newW;
      height = newH;
    } else if (dragType === 'sw') {
      let newW = Math.max(minSize, Math.min(startCrop.x + startCrop.width, startCrop.width - dx));
      let newH = Math.max(minSize, Math.min(maxH - y, startCrop.height + dy));
      if (targetRatio !== null) {
        newH = newW / targetRatio;
        if (y + newH > maxH) {
          newH = maxH - y;
          newW = newH * targetRatio;
        }
      }
      x = startCrop.x + (startCrop.width - newW);
      width = newW;
      height = newH;
    } else if (dragType === 'ne') {
      let newW = Math.max(minSize, Math.min(maxW - x, startCrop.width + dx));
      let newH = Math.max(minSize, Math.min(startCrop.y + startCrop.height, startCrop.height - dy));
      if (targetRatio !== null) {
        newW = newH * targetRatio;
        if (x + newW > maxW) {
          newW = maxW - x;
          newH = newW / targetRatio;
        }
      }
      y = startCrop.y + (startCrop.height - newH);
      width = newW;
      height = newH;
    } else if (dragType === 'nw') {
      let newW = Math.max(minSize, Math.min(startCrop.x + startCrop.width, startCrop.width - dx));
      let newH = Math.max(minSize, Math.min(startCrop.y + startCrop.height, startCrop.height - dy));
      if (targetRatio !== null) {
        newH = newW / targetRatio;
        if (newH > startCrop.y + startCrop.height) {
          newH = startCrop.y + startCrop.height;
          newW = newH * targetRatio;
        }
      }
      x = startCrop.x + (startCrop.width - newW);
      y = startCrop.y + (startCrop.height - newH);
      width = newW;
      height = newH;
    } else if (dragType === 'e' && targetRatio === null) {
      width = Math.max(minSize, Math.min(maxW - x, startCrop.width + dx));
    } else if (dragType === 's' && targetRatio === null) {
      height = Math.max(minSize, Math.min(maxH - y, startCrop.height + dy));
    } else if (dragType === 'w' && targetRatio === null) {
      const newW = Math.max(minSize, Math.min(startCrop.x + startCrop.width, startCrop.width - dx));
      x = startCrop.x + (startCrop.width - newW);
      width = newW;
    } else if (dragType === 'n' && targetRatio === null) {
      const newH = Math.max(minSize, Math.min(startCrop.y + startCrop.height, startCrop.height - dy));
      y = startCrop.y + (startCrop.height - newH);
      height = newH;
    }

    setCropBox({
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: Math.min(maxW - Math.max(0, x), width),
      height: Math.min(maxH - Math.max(0, y), height),
    });
  };

  const handlePointerUp = () => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      dragRef.current.dragType = null;
    }
  };

  // 匯出高解析度裁切圖片
  const handleConfirmCrop = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    const isSideways = rotation % 180 !== 0;
    const effectiveW = isSideways ? img.naturalHeight : img.naturalWidth;
    const effectiveH = isSideways ? img.naturalWidth : img.naturalHeight;

    const scaleX = effectiveW / displaySize.width;
    const scaleY = effectiveH / displaySize.height;

    const realCropX = Math.round(cropBox.x * scaleX);
    const realCropY = Math.round(cropBox.y * scaleY);
    const realCropW = Math.round(cropBox.width * scaleX);
    const realCropH = Math.round(cropBox.height * scaleY);

    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = effectiveW;
    fullCanvas.height = effectiveH;
    const fctx = fullCanvas.getContext('2d');
    if (!fctx) return;

    fctx.save();
    fctx.translate(effectiveW / 2, effectiveH / 2);
    if (rotation !== 0) fctx.rotate((rotation * Math.PI) / 180);
    if (flipH) fctx.scale(-1, 1);
    fctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    fctx.restore();

    let finalW = realCropW;
    let finalH = realCropH;
    if (finalW > outputMaxWidth) {
      finalH = Math.round((finalH * outputMaxWidth) / finalW);
      finalW = outputMaxWidth;
    }

    const outCanvas = document.createElement('canvas');
    outCanvas.width = Math.max(32, finalW);
    outCanvas.height = Math.max(32, finalH);
    const octx = outCanvas.getContext('2d');
    if (!octx) return;

    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(fullCanvas, realCropX, realCropY, realCropW, realCropH, 0, 0, finalW, finalH);

    const isPng = imageSrc.startsWith('data:image/png');
    const mime = isPng ? 'image/png' : 'image/jpeg';
    const croppedDataUrl = outCanvas.toDataURL(mime, isPng ? undefined : outputQuality);

    onConfirm(croppedDataUrl);
  };

  const currentPresetInfo = useMemo(() => {
    return PROPOSAL_RATIO_PRESETS.find((p) => p.key === aspectRatio) || PROPOSAL_RATIO_PRESETS[0];
  }, [aspectRatio]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/85 backdrop-blur-md p-2.5 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl bg-stone-900 border border-stone-800 text-white shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-stone-800 bg-stone-900/95 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isAvatar ? 'bg-amber-400 text-stone-950 font-black' : 'bg-blue-600 text-white'}`}>
              <Crop className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  {title || (isAvatar ? '裁切個人頭像' : '裁切提案圖片／封面')}
                </h3>
                {isAvatar && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black">
                    必須為 1:1 正方形
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400">
                {isAvatar
                  ? '拖曳方框選取居中範圍，預覽圓形頭像與正方形卡片效果'
                  : '提供多種提案常用與推薦尺寸，完美適配卡片與展示頁面'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 尺寸與比例選單列 */}
        <div className="px-4 sm:px-6 py-2.5 bg-stone-950/70 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          {isAvatar ? (
            /* 頭像模式：嚴格鎖定 1:1 正方形 */
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-stone-400">頭像比例：</span>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 text-stone-950 text-xs font-black shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>1:1 正方形（系統規範頭像比例）</span>
              </div>
              <span className="text-[11px] text-stone-400 hidden md:inline">
                （支援自由縮放與拖曳位置，外圍提供圓形輔助線）
              </span>
            </div>
          ) : (
            /* 提案模式：提供多種常用與建議尺寸 */
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-stone-400 mr-1 shrink-0">推薦常用尺寸：</span>
                {PROPOSAL_RATIO_PRESETS.map((item) => {
                  const isActive = aspectRatio === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSelectRatio(item.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-amber-400 text-stone-950 shadow-md ring-2 ring-amber-400/40'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1 py-0.2 rounded font-black ${
                            isActive ? 'bg-stone-950/20 text-stone-950' : 'bg-stone-700 text-stone-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 尺寸解析度提示 */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {currentRealPixelSize.width > 0 && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-800 text-amber-300 border border-stone-700">
                裁切尺寸：{currentRealPixelSize.width} × {currentRealPixelSize.height} px
              </span>
            )}
            {isAvatar && (
              <button
                type="button"
                onClick={() => setShowCirclePreview((v) => !v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                  showCirclePreview
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                    : 'bg-stone-800 text-stone-400 border-transparent hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>圓形預覽線</span>
              </button>
            )}
          </div>
        </div>

        {/* 提案尺寸說明條 (非頭像時顯示) */}
        {!isAvatar && (
          <div className="px-4 sm:px-6 py-1.5 bg-stone-950/40 border-b border-stone-800/60 flex items-center gap-2 text-[11px] text-stone-300">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong className="text-amber-300">{currentPresetInfo.label}</strong>（建議：{currentPresetInfo.recommendedSize}）：
              {currentPresetInfo.description}
            </span>
          </div>
        )}

        {/* 核心畫布區域 */}
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative flex-1 min-h-[300px] sm:min-h-[360px] max-h-[52vh] w-full bg-stone-950 flex items-center justify-center overflow-hidden select-none touch-none"
        >
          {/* 隱藏的底圖用以獲取 naturalWidth/Height */}
          <img
            ref={imageRef}
            src={imageSrc}
            alt=""
            onLoad={handleImageLoad}
            className="hidden"
          />

          {displaySize.width > 0 && (
            <div
              className="relative"
              style={{
                width: displaySize.width,
                height: displaySize.height,
              }}
            >
              {/* 底層旋轉與翻轉圖片 */}
              <div
                className="w-full h-full overflow-hidden flex items-center justify-center"
                style={{
                  transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
                  transition: 'transform 0.15s ease-out',
                }}
              >
                <img
                  src={imageSrc}
                  alt="裁切來源"
                  draggable={false}
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>

              {/* 4 個半透明黑色遮罩 (裁切框以外區域) */}
              <div
                className="absolute top-0 left-0 right-0 bg-black/70 pointer-events-none"
                style={{ height: cropBox.y }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 bg-black/70 pointer-events-none"
                style={{ height: Math.max(0, displaySize.height - (cropBox.y + cropBox.height)) }}
              />
              <div
                className="absolute left-0 bg-black/70 pointer-events-none"
                style={{
                  top: cropBox.y,
                  height: cropBox.height,
                  width: cropBox.x,
                }}
              />
              <div
                className="absolute right-0 bg-black/70 pointer-events-none"
                style={{
                  top: cropBox.y,
                  height: cropBox.height,
                  width: Math.max(0, displaySize.width - (cropBox.x + cropBox.width)),
                }}
              />

              {/* 核心裁切框 */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'move')}
                style={{
                  left: cropBox.x,
                  top: cropBox.y,
                  width: cropBox.width,
                  height: cropBox.height,
                }}
                className={`absolute cursor-move border-2 border-amber-400 shadow-2xl ${
                  isAvatar && showCirclePreview ? 'rounded-full overflow-hidden ring-4 ring-amber-400/40' : ''
                }`}
              >
                {/* 圓形頭像輔助框 */}
                {isAvatar && showCirclePreview && (
                  <div className="absolute inset-0 rounded-full border border-dashed border-white/80 pointer-events-none" />
                )}

                {/* 九宮格輔助線 (Rule of Thirds) */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-35">
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-white" />
                  <div className="border-r border-white" />
                  <div />
                </div>

                {/* 縮放握把 */}
                {(!isAvatar || !showCirclePreview) && (
                  <>
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'nw')}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-400 border border-stone-900 rounded-sm cursor-nwse-resize shadow-md"
                    />
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'ne')}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 border border-stone-900 rounded-sm cursor-nesw-resize shadow-md"
                    />
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'sw')}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-400 border border-stone-900 rounded-sm cursor-nesw-resize shadow-md"
                    />
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'se')}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 border border-stone-900 rounded-sm cursor-nwse-resize shadow-md"
                    />

                    {aspectRatio === 'free' && !isAvatar && (
                      <>
                        <div
                          onPointerDown={(e) => handlePointerDown(e, 'n')}
                          className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-amber-400/80 rounded-full cursor-ns-resize"
                        />
                        <div
                          onPointerDown={(e) => handlePointerDown(e, 's')}
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-amber-400/80 rounded-full cursor-ns-resize"
                        />
                        <div
                          onPointerDown={(e) => handlePointerDown(e, 'w')}
                          className="absolute -left-1 top-1/2 -translate-y-1/2 h-6 w-2 bg-amber-400/80 rounded-full cursor-ew-resize"
                        />
                        <div
                          onPointerDown={(e) => handlePointerDown(e, 'e')}
                          className="absolute -right-1 top-1/2 -translate-y-1/2 h-6 w-2 bg-amber-400/80 rounded-full cursor-ew-resize"
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部控制工具列 */}
        <div className="px-4 sm:px-6 py-2.5 bg-stone-900 border-t border-stone-800 flex items-center justify-between gap-3 flex-wrap shrink-0">
          {/* 工具按鈕：旋轉、翻轉、重設 */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRotate}
              title="向右旋轉 90 度"
              className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>旋轉 90°</span>
            </button>

            <button
              type="button"
              onClick={() => setFlipH((v) => !v)}
              title="水平鏡像翻轉"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                flipH ? 'bg-amber-400 text-stone-950 font-bold' : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
              }`}
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span>水平翻轉</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRotation(0);
                setFlipH(false);
                if (displaySize.width > 0) initCropBox(displaySize.width, displaySize.height, isAvatar ? '1:1' : aspectRatio);
              }}
              title="重設裁切與旋轉"
              className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重設</span>
            </button>
          </div>

          {/* 右下即時微縮預覽 */}
          <div className="flex items-center gap-3">
            {previewDataUrl && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-stone-400 font-medium hidden sm:inline">即時預覽：</span>
                {isAvatar || showCirclePreview ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400 bg-stone-950 shrink-0 shadow-lg">
                    <img src={previewDataUrl} alt="頭像預覽" className="w-full h-full object-cover" />
                  </div>
                ) : null}
                <div
                  className="rounded-lg overflow-hidden border border-stone-700 bg-stone-950 shrink-0 shadow-md flex items-center justify-center"
                  style={{
                    width: isAvatar ? 40 : 56,
                    height: isAvatar ? 40 : 36,
                  }}
                >
                  <img src={previewDataUrl} alt="預覽" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部動作列 */}
        <div className="px-4 sm:px-6 py-3 border-t border-stone-800 bg-stone-950/90 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div>
            {onSkip && !isAvatar && (
              <button
                type="button"
                onClick={onSkip}
                className="px-3 py-1.5 rounded-xl text-stone-400 hover:text-white text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
              >
                跳過裁切（使用原圖）
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 text-xs font-bold transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmCrop}
              className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>確認裁切並套用</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
