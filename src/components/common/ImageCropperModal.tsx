import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  ZoomIn,
  ZoomOut,
  Maximize2,
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

  // 當開啟或切換圖片時初始化
  useEffect(() => {
    if (!isOpen) return;
    setAspectRatio(isAvatar ? '1:1' : defaultRatio);
    setShowCirclePreview(isAvatar);
    setRotation(0);
    setFlipH(false);
    if (imageRef.current && imageRef.current.complete && imageRef.current.naturalWidth > 0) {
      handleImageLoad();
    }
  }, [isOpen, isAvatar, defaultRatio, imageSrc]);

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

  // 處理游標與觸控移動（使用 window 層級監聽器，防止指針捕獲失效或事件冒泡造成外部視窗閃退）
  const handlePointerDown = (
    e: React.PointerEvent,
    type: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startCrop = { ...cropBox };

    dragRef.current = {
      isDragging: true,
      dragType: type,
      startX,
      startY,
      startCrop,
    };

    const targetRatio = getRatioNumber(isAvatar ? '1:1' : aspectRatio);
    const maxW = displaySize.width;
    const maxH = displaySize.height;
    const minSize = 36;

    const onWindowPointerMove = (ev: PointerEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!dragRef.current.isDragging) return;

      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (type === 'move') {
        const allowedMaxX = Math.max(0, maxW - startCrop.width);
        const allowedMaxY = Math.max(0, maxH - startCrop.height);
        const rawNewX = startCrop.x + dx;
        const rawNewY = startCrop.y + dy;
        const safeX = Math.round(Math.max(0, Math.min(allowedMaxX, rawNewX)));
        const safeY = Math.round(Math.max(0, Math.min(allowedMaxY, rawNewY)));
        setCropBox((prev) => ({
          ...prev,
          x: isNaN(safeX) ? 0 : safeX,
          y: isNaN(safeY) ? 0 : safeY,
        }));
        return;
      }

      let { x, y, width, height } = startCrop;

      if (type === 'se') {
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
      } else if (type === 'sw') {
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
      } else if (type === 'ne') {
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
      } else if (type === 'nw') {
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
      } else if (type === 'e' && targetRatio === null) {
        width = Math.max(minSize, Math.min(maxW - x, startCrop.width + dx));
      } else if (type === 's' && targetRatio === null) {
        height = Math.max(minSize, Math.min(maxH - y, startCrop.height + dy));
      } else if (type === 'w' && targetRatio === null) {
        const newW = Math.max(minSize, Math.min(startCrop.x + startCrop.width, startCrop.width - dx));
        x = startCrop.x + (startCrop.width - newW);
        width = newW;
      } else if (type === 'n' && targetRatio === null) {
        const newH = Math.max(minSize, Math.min(startCrop.y + startCrop.height, startCrop.height - dy));
        y = startCrop.y + (startCrop.height - newH);
        height = newH;
      }

      const finalX = Math.round(Math.max(0, x));
      const finalY = Math.round(Math.max(0, y));
      const finalW = Math.round(Math.min(maxW - finalX, Math.max(minSize, width)));
      const finalH = Math.round(Math.min(maxH - finalY, Math.max(minSize, height)));

      setCropBox({
        x: isNaN(finalX) ? 0 : finalX,
        y: isNaN(finalY) ? 0 : finalY,
        width: isNaN(finalW) ? minSize : finalW,
        height: isNaN(finalH) ? minSize : finalH,
      });
    };

    const onWindowPointerUp = (ev: PointerEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      dragRef.current.isDragging = false;
      dragRef.current.dragType = null;
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
    };

    window.addEventListener('pointermove', onWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', onWindowPointerUp, { passive: false });
    window.addEventListener('pointercancel', onWindowPointerUp, { passive: false });
  };

  // 電腦與滑鼠支援：平滑縮放計算（以指定中心點或裁切框中心為錨點）
  const applyZoomMultiplier = useCallback(
    (factor: number, pivotX?: number, pivotY?: number) => {
      if (displaySize.width <= 0 || displaySize.height <= 0) return;
      const targetRatio = getRatioNumber(isAvatar ? '1:1' : aspectRatio);
      const minSize = 36;
      const maxW = displaySize.width;
      const maxH = displaySize.height;

      // 當前比例在容器下的最大允許寬高
      let baseMaxW = maxW;
      let baseMaxH = maxH;
      if (targetRatio !== null) {
        if (maxW / maxH > targetRatio) {
          baseMaxW = maxH * targetRatio;
          baseMaxH = maxH;
        } else {
          baseMaxW = maxW;
          baseMaxH = maxW / targetRatio;
        }
      }

      let newW = cropBox.width * factor;
      let newH = cropBox.height * factor;

      if (targetRatio !== null) {
        newW = Math.max(minSize, Math.min(baseMaxW, newW));
        newH = newW / targetRatio;
        if (newH > baseMaxH) {
          newH = baseMaxH;
          newW = newH * targetRatio;
        }
      } else {
        newW = Math.max(minSize, Math.min(baseMaxW, newW));
        newH = Math.max(minSize, Math.min(baseMaxH, newH));
      }

      const px = pivotX !== undefined ? pivotX : cropBox.x + cropBox.width / 2;
      const py = pivotY !== undefined ? pivotY : cropBox.y + cropBox.height / 2;

      const ratioX = cropBox.width > 0 ? (px - cropBox.x) / cropBox.width : 0.5;
      const ratioY = cropBox.height > 0 ? (py - cropBox.y) / cropBox.height : 0.5;

      let newX = px - ratioX * newW;
      let newY = py - ratioY * newH;

      newX = Math.max(0, Math.min(maxW - newW, newX));
      newY = Math.max(0, Math.min(maxH - newH, newY));

      setCropBox({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      });
    },
    [cropBox, displaySize, isAvatar, aspectRatio, getRatioNumber]
  );

  // 當前縮放倍率計算（1.0x 全景 ~ 4.0x 局部特寫）
  const currentZoomRatio = useMemo(() => {
    if (displaySize.width <= 0 || cropBox.width <= 0) return 1.0;
    const targetRatio = getRatioNumber(isAvatar ? '1:1' : aspectRatio);
    let baseMaxW = displaySize.width;
    let baseMaxH = displaySize.height;
    if (targetRatio !== null) {
      if (displaySize.width / displaySize.height > targetRatio) {
        baseMaxW = displaySize.height * targetRatio;
      } else {
        baseMaxW = displaySize.width;
      }
    }
    const z = baseMaxW / cropBox.width;
    return Math.max(1.0, Math.min(4.0, Number(z.toFixed(2))));
  }, [cropBox.width, displaySize, isAvatar, aspectRatio, getRatioNumber]);

  // 電腦滾輪縮放（向上滾動放大細節，向下滾動視野拉寬）
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (displaySize.width <= 0 || displaySize.height <= 0 || !containerRef.current) return;

    // deltaY < 0 為向上滾動（放大特寫，框縮小），deltaY > 0 為向下滾動（視野拉遠，框放大）
    const factor = e.deltaY < 0 ? 0.92 : 1.08;

    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseInContainerX = e.clientX - containerRect.left;
    const mouseInContainerY = e.clientY - containerRect.top;

    const pivotX = Math.max(0, Math.min(displaySize.width, mouseInContainerX - displaySize.left));
    const pivotY = Math.max(0, Math.min(displaySize.height, mouseInContainerY - displaySize.top));

    applyZoomMultiplier(factor, pivotX, pivotY);
  };

  // 滑桿控制縮放倍率
  const handleSliderZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetZoom = parseFloat(e.target.value);
    if (isNaN(targetZoom) || targetZoom <= 0) return;
    const targetRatio = getRatioNumber(isAvatar ? '1:1' : aspectRatio);

    let baseMaxW = displaySize.width;
    let baseMaxH = displaySize.height;
    if (targetRatio !== null) {
      if (displaySize.width / displaySize.height > targetRatio) {
        baseMaxW = displaySize.height * targetRatio;
        baseMaxH = displaySize.height;
      } else {
        baseMaxW = displaySize.width;
        baseMaxH = displaySize.width / targetRatio;
      }
    }

    const targetW = baseMaxW / targetZoom;
    const targetH = targetRatio !== null ? targetW / targetRatio : baseMaxH / targetZoom;

    const centerX = cropBox.x + cropBox.width / 2;
    const centerY = cropBox.y + cropBox.height / 2;

    let newX = centerX - targetW / 2;
    let newY = centerY - targetH / 2;

    newX = Math.max(0, Math.min(displaySize.width - targetW, newX));
    newY = Math.max(0, Math.min(displaySize.height - targetH, newY));

    setCropBox({
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(targetW),
      height: Math.round(targetH),
    });
  };

  // 重設縮放回 1.0x 全景
  const handleResetZoom = useCallback(() => {
    if (displaySize.width > 0 && displaySize.height > 0) {
      initCropBox(displaySize.width, displaySize.height, isAvatar ? '1:1' : aspectRatio);
    }
  }, [displaySize, isAvatar, aspectRatio, initCropBox]);

  const handleConfirmCropRef = useRef<() => void>(() => {});
  const onCloseRef = useRef<() => void>(() => {});

  // 電腦鍵盤快捷鍵：+ / - 縮放、0 重設、方向鍵微調移動、Enter 確認、Escape 關閉
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmCropRef.current();
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        applyZoomMultiplier(0.92);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        applyZoomMultiplier(1.08);
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 18 : 6;
        setCropBox((prev) => {
          let { x, y } = prev;
          if (e.key === 'ArrowLeft') x = Math.max(0, x - step);
          if (e.key === 'ArrowRight') x = Math.min(displaySize.width - prev.width, x + step);
          if (e.key === 'ArrowUp') y = Math.max(0, y - step);
          if (e.key === 'ArrowDown') y = Math.min(displaySize.height - prev.height, y + step);
          return { ...prev, x, y };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, applyZoomMultiplier, handleResetZoom, displaySize]);

  // 匯出高解析度裁切圖片
  const handleConfirmCrop = () => {
    if (!imageRef.current || displaySize.width <= 0 || displaySize.height <= 0) {
      if (imageSrc) onConfirm(imageSrc);
      return;
    }
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

    // 白底填充避免透明 PNG 轉 JPEG 時出現黑底
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, finalW, finalH);

    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(fullCanvas, realCropX, realCropY, realCropW, realCropH, 0, 0, finalW, finalH);

    const isPng = imageSrc.startsWith('data:image/png');
    // 頭像若小於等於 512px 且原為 PNG 可保留 PNG，其他提案與封面一律轉高品質 JPEG，防止 base64 膨脹超過 Firestore 1MB / localStorage 配額
    const usePng = isAvatar && isPng && finalW <= 512 && finalH <= 512;
    const mime = usePng ? 'image/png' : 'image/jpeg';
    const quality = usePng ? undefined : Math.min(outputQuality, 0.88);
    const croppedDataUrl = outCanvas.toDataURL(mime, quality);

    onConfirm(croppedDataUrl);
  };

  handleConfirmCropRef.current = handleConfirmCrop;
  onCloseRef.current = onClose;

  const currentPresetInfo = useMemo(() => {
    return PROPOSAL_RATIO_PRESETS.find((p) => p.key === aspectRatio) || PROPOSAL_RATIO_PRESETS[0];
  }, [aspectRatio]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-2.5 sm:p-5 animate-in fade-in duration-200"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl bg-stone-900 border border-stone-700/80 text-white shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-stone-800 bg-stone-900/95 shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className={`p-2 rounded-xl shrink-0 ${isAvatar ? 'bg-amber-400 text-stone-950 font-black' : 'bg-blue-600 text-white'}`}>
              <Crop className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white truncate">
                  {title || (isAvatar ? '裁切個人頭像' : '裁切提案圖片／封面')}
                </h3>
                {isAvatar && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black shrink-0">
                    必須為 1:1 正方形
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400 truncate hidden sm:block">
                {isAvatar
                  ? '拖曳方框選取居中範圍，預覽圓形頭像與正方形卡片效果'
                  : '提供多種提案常用與推薦尺寸，完美適配卡片與展示頁面'}
              </p>
            </div>
          </div>

          {/* 頂部顯眼確認與關閉按鈕（保證在任何螢幕高度下都能直接看見並點擊） */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleConfirmCrop}
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 text-xs sm:text-sm font-black shadow-lg shadow-amber-500/25 flex items-center gap-1.5 transition-all cursor-pointer ring-2 ring-amber-400/50"
              title="確認裁切並套用儲存（亦可按鍵盤 Enter）"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>確認儲存</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              title="取消並關閉（Esc）"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
          onWheel={handleWheel}
          className="relative flex-1 min-h-[220px] sm:min-h-[280px] max-h-[42vh] sm:max-h-[48vh] w-full bg-stone-950 flex items-center justify-center overflow-hidden select-none touch-none"
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

                {/* 4 個角隅縮放握把（支援所有模式，電腦滑鼠與手機均可輕鬆拖曳調整縮放） */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'nw')}
                  title="拖曳縮放（左上角）"
                  className="absolute -top-2 -left-2 w-4.5 h-4.5 bg-amber-400 hover:bg-amber-300 border-2 border-stone-950 rounded-md cursor-nwse-resize shadow-lg transition-transform hover:scale-125 z-20 flex items-center justify-center"
                >
                  <div className="w-1.5 h-1.5 bg-stone-950 rounded-xs pointer-events-none" />
                </div>
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'ne')}
                  title="拖曳縮放（右上角）"
                  className="absolute -top-2 -right-2 w-4.5 h-4.5 bg-amber-400 hover:bg-amber-300 border-2 border-stone-950 rounded-md cursor-nesw-resize shadow-lg transition-transform hover:scale-125 z-20 flex items-center justify-center"
                >
                  <div className="w-1.5 h-1.5 bg-stone-950 rounded-xs pointer-events-none" />
                </div>
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'sw')}
                  title="拖曳縮放（左下角）"
                  className="absolute -bottom-2 -left-2 w-4.5 h-4.5 bg-amber-400 hover:bg-amber-300 border-2 border-stone-950 rounded-md cursor-nesw-resize shadow-lg transition-transform hover:scale-125 z-20 flex items-center justify-center"
                >
                  <div className="w-1.5 h-1.5 bg-stone-950 rounded-xs pointer-events-none" />
                </div>
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'se')}
                  title="拖曳縮放（右下角）"
                  className="absolute -bottom-2 -right-2 w-4.5 h-4.5 bg-amber-400 hover:bg-amber-300 border-2 border-stone-950 rounded-md cursor-nwse-resize shadow-lg transition-transform hover:scale-125 z-20 flex items-center justify-center"
                >
                  <div className="w-1.5 h-1.5 bg-stone-950 rounded-xs pointer-events-none" />
                </div>

                {aspectRatio === 'free' && !isAvatar && (
                  <>
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'n')}
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-amber-400 hover:bg-amber-300 border border-stone-950 rounded-full cursor-ns-resize z-20 shadow-md"
                    />
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 's')}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-amber-400 hover:bg-amber-300 border border-stone-950 rounded-full cursor-ns-resize z-20 shadow-md"
                    />
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'w')}
                      className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-8 w-3 bg-amber-400 hover:bg-amber-300 border border-stone-950 rounded-full cursor-ew-resize z-20 shadow-md"
                    />
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'e')}
                      className="absolute -right-1.5 top-1/2 -translate-y-1/2 h-8 w-3 bg-amber-400 hover:bg-amber-300 border border-stone-950 rounded-full cursor-ew-resize z-20 shadow-md"
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* 畫布內懸浮快捷確認按鈕 */}
          <button
            type="button"
            onClick={handleConfirmCrop}
            className="absolute bottom-3 right-3 sm:right-4 z-20 px-3.5 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black shadow-xl flex items-center gap-1.5 border border-amber-300/80 cursor-pointer active:scale-95 backdrop-blur-sm transition-all ring-2 ring-amber-400/40"
            title="點擊確認裁切範圍（Enter）"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>完成此處裁切</span>
          </button>
        </div>

        {/* 底部控制工具列 */}
        <div className="px-4 sm:px-6 py-2.5 bg-stone-900 border-t border-stone-800 flex items-center justify-between gap-3 flex-wrap shrink-0">
          {/* 工具按鈕：旋轉、翻轉、重設 */}
          <div className="flex items-center gap-1.5 flex-wrap">
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

          {/* 電腦桌面縮放控制列（滾輪 / 滑桿 / 快速按鈕） */}
          <div className="flex items-center gap-2 bg-stone-950/80 px-2.5 py-1 rounded-xl border border-stone-800/80">
            <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1">
              縮放：
            </span>
            <button
              type="button"
              onClick={() => applyZoomMultiplier(1.1)}
              title="縮小視野（亦可滾動滑鼠滾輪或按鍵盤 - 鍵）"
              className="p-1 rounded-md text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 transition-all cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="1.0"
              max="4.0"
              step="0.05"
              value={currentZoomRatio}
              onChange={handleSliderZoomChange}
              className="w-20 sm:w-24 accent-amber-400 cursor-pointer h-1.5 bg-stone-700 rounded-lg"
              title="滑動調整縮放（電腦支援滾動滑鼠滾輪縮放）"
            />
            <button
              type="button"
              onClick={() => applyZoomMultiplier(0.9)}
              title="放大特寫（亦可滾動滑鼠滾輪或按鍵盤 + 鍵）"
              className="p-1 rounded-md text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 transition-all cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-amber-300 min-w-[2.2rem] text-right font-bold">
              {currentZoomRatio.toFixed(1)}x
            </span>
            <button
              type="button"
              onClick={handleResetZoom}
              title="重設縮放為 1.0x 全景（或按鍵盤 0 鍵）"
              className="px-2 py-0.5 rounded text-[10px] font-bold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 transition-colors ml-0.5 cursor-pointer flex items-center gap-1"
            >
              <Maximize2 className="w-3 h-3" />
              <span>全景</span>
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

        {/* 底部動作列 (黏著底部，確保隨時可見確認與儲存鍵) */}
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 border-t-2 border-stone-800 bg-stone-950 sticky bottom-0 z-30 flex items-center justify-between gap-2.5 flex-wrap shrink-0 shadow-2xl">
          <div className="flex items-center gap-3">
            {onSkip && !isAvatar && (
              <button
                type="button"
                onClick={onSkip}
                className="px-3 py-1.5 rounded-xl text-stone-400 hover:text-white text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
              >
                跳過裁切（使用原圖）
              </button>
            )}
            <span className="text-[11px] text-stone-400 hidden sm:inline">
              提示：可按鍵盤 <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 font-mono text-[10px] border border-stone-700">Enter</kbd> 直接確認儲存，或按 <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 font-mono text-[10px] border border-stone-700">Esc</kbd> 取消
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 sm:px-4 py-2 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmCrop}
              className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:brightness-105 active:scale-95 text-stone-950 text-xs sm:text-sm font-black shadow-xl shadow-amber-500/30 flex items-center gap-2 transition-all cursor-pointer ring-2 ring-amber-400/60"
            >
              <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
              <span>確認裁切並套用儲存</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default ImageCropperModal;
