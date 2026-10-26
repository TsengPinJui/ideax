import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, BriefcaseBusiness, Building2, ChevronRight, Compass, Gamepad2, MapPin, Minus, PanelsTopLeft, Plus, RotateCcw, RotateCw, Route, ScrollText, Search, Users } from 'lucide-react';
import { IdeaXIsland, IslandAction, IslandDistrict, IslandStand, IslandStreet, IDEAX_ISLANDS, matchesIslandContent } from '../../data/islandWorld';
import { Question } from '../../types';
import './IslandWorldView.css';

interface IslandWorldViewProps {
  questions: Question[];
  onOpenQuestion: (question: Question) => void;
  onAction: (action: IslandAction) => void;
}

const ISLAND_SHAPES: Record<string, string> = {
  home: 'M -108 -34 C -92 -63 -50 -73 -18 -69 C 8 -82 48 -66 72 -51 C 101 -42 116 -13 105 12 C 111 40 75 67 43 69 C 18 84 -24 72 -48 66 C -83 63 -112 34 -105 6 C -119 -7 -121 -20 -108 -34 Z',
  creative: 'M -113 -25 C -99 -55 -72 -67 -43 -63 C -25 -79 1 -69 20 -72 C 54 -80 83 -54 87 -34 C 118 -17 120 9 101 31 C 94 56 63 66 39 61 C 10 81 -20 70 -41 74 C -76 72 -99 51 -96 31 C -118 16 -125 -6 -113 -25 Z',
  pain: 'M -104 -31 C -84 -57 -54 -68 -30 -62 C -8 -82 20 -64 45 -61 C 78 -61 105 -38 104 -11 C 117 11 94 35 77 48 C 56 70 20 64 1 72 C -28 77 -57 61 -66 44 C -91 38 -113 6 -104 -31 Z',
  discussion: 'M -111 -20 C -101 -49 -76 -59 -48 -56 C -27 -73 4 -70 21 -56 C 51 -65 86 -46 91 -24 C 116 -9 113 20 93 34 C 84 58 52 69 27 58 C 7 77 -23 66 -43 66 C -76 71 -101 50 -96 30 C -115 17 -120 -3 -111 -20 Z',
  career: 'M -112 -35 C -95 -62 -62 -66 -39 -59 C -12 -75 19 -72 39 -54 C 71 -58 102 -35 101 -10 C 119 11 103 38 83 48 C 66 73 34 70 11 65 C -9 82 -39 68 -56 62 C -85 64 -112 43 -107 17 C -123 -1 -123 -21 -112 -35 Z',
};
const DEFAULT_ISLAND_SHAPE = 'M -105 -38 C -71 -72 -22 -80 22 -70 C 70 -65 105 -40 112 -4 C 115 28 82 57 48 70 C 4 84 -63 65 -96 41 C -119 21 -123 -15 -105 -38 Z';
const ISLAND_SCALE: Record<IdeaXIsland['mapPosition']['size'], number> = { small: 0.74, medium: 0.91, large: 1.08 };

function IslandLandmark({ tint, islandId }: { tint: string; islandId: string }) {
  const treesByIsland: Record<string, Array<[number, number]>> = {
    home: [[-69, -19], [-49, 38], [74, -12], [66, 37]],
    creative: [[-77, -12], [-57, 39], [79, 20]],
    pain: [[-70, 9], [69, -23], [59, 38]],
    discussion: [[-78, -12], [-54, 40], [71, 36]],
    career: [[-75, -17], [-48, 40], [73, -6]],
  };
  const roadByIsland: Record<string, string> = {
    home: 'M -84 24 C -48 16 -39 -3 -9 -8 C 24 -14 39 10 82 6',
    creative: 'M -83 26 C -50 32 -36 2 -8 9 C 17 14 42 -20 82 -5',
    pain: 'M -82 -2 C -49 -15 -37 10 -13 19 C 10 28 43 4 82 22',
    discussion: 'M -83 20 C -56 1 -35 15 -12 -7 C 14 -31 40 17 82 -4',
    career: 'M -84 13 C -57 28 -38 2 -15 -4 C 12 -9 37 20 81 9',
  };
  const trees = treesByIsland[islandId] || [[-67, -17], [71, -20], [29, 51]];
  const road = roadByIsland[islandId] || 'M -88 1 C -49 -5 -25 15 0 1 C 28 -14 50 -4 91 3';

  return (
    <g className="island-landmarks" aria-hidden="true">
      <path d={road} fill="none" stroke="#988461" strokeWidth="13" strokeLinecap="round" />
      <path d={road} fill="none" stroke="#efe5c8" strokeWidth="8" strokeLinecap="round" />
      {trees.map(([x, y], index) => (
        <g key={`tree-${index}`} transform={`translate(${x} ${y})`}>
          <ellipse cx="3" cy="8" rx="8" ry="3.5" fill="#736855" opacity=".24" />
          <path d="M 0 2 L 1 10" stroke="#8b674b" strokeWidth="3" strokeLinecap="round" />
          <path d={`M -9 -2 C -10 -8 -4 -13 1 -10 C 5 -15 12 -9 10 -3 C 9 3 -5 4 -9 -2 Z`} fill={index % 2 ? '#718e5e' : '#89a36d'} stroke="#58764e" strokeWidth="1" />
          <ellipse cx="-4" cy="-7" rx="3.7" ry="2.8" fill={tint} opacity=".7" />
          <circle cx="5" cy="-7" r="2.2" fill="#b5c68f" opacity=".9" />
        </g>
      ))}
      {islandId === 'home' && (
        <g transform="translate(5 -24)">
          <ellipse cx="0" cy="32" rx="30" ry="7" fill="#8c9e7a" opacity=".4" />
          <rect x="-26" y="-4" width="52" height="33" rx="2" fill="#eadbb9" stroke="#8b7552" strokeWidth="1.5" />
          <path d="M -31 -4 L 0 -27 L 31 -4 Z" fill="#b46f51" stroke="#805c45" strokeWidth="1.5" />
          <path d="M -18 3 V 21 M 0 3 V 21 M 18 3 V 21" stroke="#8e7353" strokeWidth="2" />
          <path d="M -25 5 H 25 M -25 11 H 25" stroke="#d1b98a" strokeWidth="1.5" />
          <circle cx="0" cy="-17" r="3" fill="#f6e5ad" />
        </g>
      )}
      {islandId === 'creative' && (
        <g transform="translate(9 -18)">
          <rect x="-38" y="-1" width="33" height="31" rx="3" fill="#e7d7b1" stroke="#8b7552" strokeWidth="1.5" />
          <path d="M -42 0 L -22 -17 L -1 0 Z" fill="#cf7658" stroke="#875c47" strokeWidth="1.5" />
          <rect x="-31" y="7" width="19" height="23" rx="2" fill="#4e7775" />
          <path d="M -27 13 H -16 M -27 18 H -16" stroke="#e8cc7a" strokeWidth="2" />
          <rect x="13" y="4" width="31" height="25" rx="2" fill="#eddcb6" stroke="#8b7552" strokeWidth="1.5" />
          <path d="M 9 5 L 29 -11 L 48 5 Z" fill="#d7a44f" stroke="#8b7552" strokeWidth="1.5" />
          <circle cx="28" cy="15" r="7" fill="#8bb7b0" stroke="#527a73" strokeWidth="1.5" />
          <path d="M 26 15 H 30 M 28 13 V 17" stroke="#fff7d8" strokeWidth="1.5" />
        </g>
      )}
      {islandId === 'pain' && (
        <g transform="translate(3 -19)">
          <ellipse cx="0" cy="37" rx="38" ry="7" fill="#78614c" opacity=".28" />
          <rect x="-31" y="-3" width="62" height="37" fill="#9b6540" stroke="#69452f" strokeWidth="2" />
          <path d="M -38 -4 L -29 -19 H 29 L 38 -4 L 28 -1 L 20 -10 H -20 L -28 -1 Z" fill="#873f2e" stroke="#613b30" strokeWidth="2" strokeLinejoin="round" />
          <path d="M -34 -19 L -25 -31 H 25 L 34 -19 L 25 -16 L 18 -23 H -18 L -25 -16 Z" fill="#a44f37" stroke="#613b30" strokeWidth="2" strokeLinejoin="round" />
          <path d="M -25 -2 V 32 M 25 -2 V 32" stroke="#e0bc7c" strokeWidth="4" />
          <rect x="-9" y="5" width="18" height="29" rx="8" fill="#503c30" stroke="#d5b273" strokeWidth="1.5" />
          <path d="M -22 3 H -13 V 13 H -22 Z M 13 3 H 22 V 13 H 13 Z" fill="#f3d58a" stroke="#68442f" strokeWidth="1.3" />
          <path d="M -18 6 V 11 M 18 6 V 11" stroke="#875838" strokeWidth="1" />
          <path d="M -10 -29 H 10 V -21 H -10 Z" fill="#eed6a0" stroke="#704936" strokeWidth="1.2" />
          <text x="0" y="-23" textAnchor="middle" fontSize="5" fontWeight="800" fill="#70412d">創點樓</text>
          <path d="M -36 35 H 36" stroke="#e2c996" strokeWidth="4" />
        </g>
      )}
      {islandId === 'discussion' && (
        <g transform="translate(4 -15)">
          <path d="M -39 2 H 40 M -32 2 V 28 M 32 2 V 28" stroke="#8a6248" strokeWidth="3" />
          <path d="M -43 2 L -30 -12 H 30 L 43 2 Z" fill="#b9684d" stroke="#81513f" strokeWidth="1.5" />
          <path d="M -31 -5 H 31" stroke="#f2d8a5" strokeWidth="2" strokeDasharray="5 4" />
          <ellipse cx="0" cy="24" rx="26" ry="7" fill="#ac8052" stroke="#765b43" strokeWidth="1.5" />
          <path d="M -21 24 V 33 M 21 24 V 33" stroke="#765b43" strokeWidth="2" />
          <circle cx="-12" cy="15" r="3" fill="#f4e4c1" />
          <circle cx="12" cy="15" r="3" fill="#f4e4c1" />
          <path d="M -8 -13 q -4 -5 1 -8 M 0 -13 q -4 -5 1 -8 M 8 -13 q -4 -5 1 -8" fill="none" stroke="#fff0ce" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )}
      {islandId === 'career' && (
        <g transform="translate(4 -18)">
          <path d="M -34 24 V -5 M 34 24 V -5 M -42 -5 H 42 M -45 -5 L -30 -17 H 30 L 45 -5 Z" fill="#c47553" stroke="#7e5140" strokeWidth="2" />
          <path d="M -42 1 H 42" stroke="#f3d59b" strokeWidth="3" />
          <path d="M -23 5 V 25 M -8 5 V 25 M 8 5 V 25 M 23 5 V 25" stroke="#d7b77e" strokeWidth="3" />
          <path d="M -28 25 H 28 M -23 31 H 23 M -17 37 H 17" stroke="#8d6c4b" strokeWidth="3" strokeLinecap="round" />
          <rect x="-4" y="4" width="8" height="13" rx="4" fill="#efd489" stroke="#8c6348" strokeWidth="1.3" />
          <path d="M -4 10 H 4" stroke="#8c6348" strokeWidth="1" />
        </g>
      )}
    </g>
  );
}

function ArchipelagoMap({
  selectedIslandId,
  contentCounts,
  onSelectIsland,
}: {
  selectedIslandId: string | null;
  contentCounts: Record<string, number>;
  onSelectIsland: (islandId: string) => void;
}) {
  const [view, setView] = useState({ zoom: 1, rotation: 0, x: 0, y: 0 });
  const [gestureMode, setGestureMode] = useState<'pan' | 'rotate' | null>(null);
  const mapFrameRef = useRef<HTMLDivElement>(null);
  const pointerPositions = useRef(new Map<number, { x: number; y: number }>());
  const dragStart = useRef<{ pointerId: number; x: number; y: number; viewX: number; viewY: number; rotation: number; mode: 'pan' | 'rotate'; islandId: string | null; moved: boolean } | null>(null);
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const panCurrentRef = useRef({ x: 0, y: 0 });
  const panTargetRef = useRef({ x: 0, y: 0 });
  const panFrameRef = useRef<number | null>(null);
  const bridgePaths = [
    'M 350 245 C 393 264 418 280 446 305',
    'M 355 455 C 397 428 421 407 452 385',
    'M 654 235 C 615 266 590 286 562 306',
    'M 658 445 C 616 415 590 393 561 376',
  ];

  const updateZoom = (nextZoom: number) => {
    setView((current) => ({ ...current, zoom: Math.min(2.2, Math.max(0.75, nextZoom)) }));
  };

  const animatePan = () => {
    const current = panCurrentRef.current;
    const target = panTargetRef.current;
    const nextX = current.x + (target.x - current.x) * 0.42;
    const nextY = current.y + (target.y - current.y) * 0.42;
    const settled = Math.abs(target.x - nextX) < 0.12 && Math.abs(target.y - nextY) < 0.12;
    const next = settled ? target : { x: nextX, y: nextY };

    panCurrentRef.current = next;
    setView((currentView) => ({ ...currentView, x: next.x, y: next.y }));
    if (settled) {
      panFrameRef.current = null;
    } else {
      panFrameRef.current = requestAnimationFrame(animatePan);
    }
  };

  const movePanTo = (x: number, y: number) => {
    panTargetRef.current = { x, y };
    if (panFrameRef.current === null) panFrameRef.current = requestAnimationFrame(animatePan);
  };

  useEffect(() => () => {
    if (panFrameRef.current !== null) cancelAnimationFrame(panFrameRef.current);
  }, []);

  useEffect(() => {
    if (gestureMode === null && panFrameRef.current === null) {
      const position = { x: view.x, y: view.y };
      panCurrentRef.current = position;
      panTargetRef.current = position;
    }
  }, [gestureMode, view.x, view.y]);

  const zoomAtPointer = (deltaY: number, clientX: number, clientY: number) => {
    const svg = mapFrameRef.current?.querySelector('svg');
    const bounds = svg?.getBoundingClientRect();
    if (!bounds || !bounds.width || !bounds.height) {
      setView((current) => ({ ...current, zoom: Math.min(2.2, Math.max(0.75, current.zoom * Math.exp(-deltaY * 0.001))) }));
      return;
    }

    const viewScale = Math.min(bounds.width / 1000, bounds.height / 680);
    const letterboxX = (bounds.width - viewScale * 1000) / 2;
    const letterboxY = (bounds.height - viewScale * 680) / 2;
    const pointerX = (clientX - bounds.left - letterboxX) / viewScale;
    const pointerY = (clientY - bounds.top - letterboxY) / viewScale;

    setView((current) => {
      const nextZoom = Math.min(2.2, Math.max(0.75, current.zoom * Math.exp(-deltaY * 0.001)));
      const zoomRatio = (current.zoom - nextZoom) / current.zoom;
      const maxPanX = Math.min(420, 140 + (nextZoom - 1) * 260);
      const maxPanY = Math.min(280, 100 + (nextZoom - 1) * 160);
      const nextX = Math.min(maxPanX, Math.max(-maxPanX, current.x + zoomRatio * (pointerX - 500 - current.x)));
      const nextY = Math.min(maxPanY, Math.max(-maxPanY, current.y + zoomRatio * (pointerY - 340 - current.y)));
      return { ...current, zoom: nextZoom, x: nextX, y: nextY };
    });
  };

  useEffect(() => {
    const frame = mapFrameRef.current;
    if (!frame) return;

    const handleWheelZoom = (event: WheelEvent) => {
      event.preventDefault();
      if (event.target instanceof Element && event.target.closest('.island-map-controls')) return;
      zoomAtPointer(event.deltaY, event.clientX, event.clientY);
    };

    frame.addEventListener('wheel', handleWheelZoom, { passive: false });
    return () => frame.removeEventListener('wheel', handleWheelZoom);
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.button !== 0 && event.button !== 2) || (event.target as Element).closest('.island-map-controls')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerPositions.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerPositions.current.size === 1) {
      const mode = event.pointerType === 'mouse' && event.button === 2 ? 'rotate' : 'pan';
      const islandId = mode === 'pan' ? (event.target as Element).closest<SVGGElement>('.island-map-node')?.dataset.islandId || null : null;
      if (mode === 'pan') {
        if (panFrameRef.current !== null) cancelAnimationFrame(panFrameRef.current);
        panFrameRef.current = null;
        panTargetRef.current = panCurrentRef.current;
      }
      dragStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, viewX: mode === 'pan' ? panCurrentRef.current.x : view.x, viewY: mode === 'pan' ? panCurrentRef.current.y : view.y, rotation: view.rotation, mode, islandId, moved: false };
      setGestureMode(mode);
    } else if (pointerPositions.current.size === 2) {
      suppressClickUntil.current = Date.now() + 1000;
      const [first, second] = Array.from(pointerPositions.current.values());
      pinchStart.current = { distance: Math.hypot(second.x - first.x, second.y - first.y), zoom: view.zoom };
      dragStart.current = null;
      setGestureMode(null);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerPositions.current.has(event.pointerId)) return;
    pointerPositions.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerPositions.current.size >= 2 && pinchStart.current) {
      const [first, second] = Array.from(pointerPositions.current.values());
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      if (pinchStart.current.distance > 0) updateZoom(pinchStart.current.zoom * distance / pinchStart.current.distance);
      return;
    }
    const start = dragStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.hypot(deltaX, deltaY) > 4) start.moved = true;
    if (!start.moved) return;
    if (start.mode === 'rotate') {
      setView((current) => ({ ...current, rotation: start.rotation + deltaX * 0.45 }));
      return;
    }
    const svg = event.currentTarget.querySelector('svg');
    const bounds = svg?.getBoundingClientRect();
    const viewScale = bounds ? Math.min(bounds.width / 1000, bounds.height / 680) : 1;
    const maxPanX = Math.min(420, 140 + (view.zoom - 1) * 260);
    const maxPanY = Math.min(280, 100 + (view.zoom - 1) * 160);
    const dragSensitivity = 0.58;
    const nextX = Math.min(maxPanX, Math.max(-maxPanX, start.viewX + (deltaX / viewScale) * dragSensitivity));
    const nextY = Math.min(maxPanY, Math.max(-maxPanY, start.viewY + (deltaY / viewScale) * dragSensitivity));
    movePanTo(nextX, nextY);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>, allowTapSelection: boolean) => {
    const activeDrag = dragStart.current?.pointerId === event.pointerId ? dragStart.current : null;
    const dragged = Boolean(activeDrag?.moved);
    if (dragged) suppressClickUntil.current = Date.now() + 250;
    else if (allowTapSelection && activeDrag?.mode === 'pan' && activeDrag.islandId) {
      suppressClickUntil.current = Date.now() + 250;
      onSelectIsland(activeDrag.islandId);
    }
    pointerPositions.current.delete(event.pointerId);
    if (pointerPositions.current.size < 2) pinchStart.current = null;
    if (dragStart.current?.pointerId === event.pointerId || pointerPositions.current.size === 0) {
      dragStart.current = null;
      setGestureMode(null);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (pointerPositions.current.size === 1) {
      const [remainingId, point] = Array.from(pointerPositions.current.entries())[0];
      dragStart.current = { pointerId: remainingId, x: point.x, y: point.y, viewX: view.x, viewY: view.y, rotation: view.rotation, mode: 'pan', islandId: null, moved: false };
      setGestureMode('pan');
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => handlePointerEnd(event, true);
  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => handlePointerEnd(event, false);

  const resetView = () => {
    if (panFrameRef.current !== null) cancelAnimationFrame(panFrameRef.current);
    panFrameRef.current = null;
    panCurrentRef.current = { x: 0, y: 0 };
    panTargetRef.current = { x: 0, y: 0 };
    setView({ zoom: 1, rotation: 0, x: 0, y: 0 });
  };

  return (
    <div
      ref={mapFrameRef}
      className={`island-map-frame${gestureMode ? ` is-${gestureMode === 'rotate' ? 'rotating' : 'dragging'}` : ''}`}
      aria-label="創點島俯視地圖：左鍵拖曳移動，右鍵拖曳轉向，滑鼠滾輪縮放"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(event) => event.preventDefault()}
    >
      <h1 className="island-map-title">IdeaX 地圖</h1>
      <div className="island-map-controls" aria-label="地圖操作">
        <div className="island-map-zoom-controls" aria-label="縮放地圖">
          <button type="button" onClick={() => updateZoom(view.zoom - 0.15)} aria-label="縮小地圖"><Minus size={15} /></button>
          <output aria-live="polite">{Math.round(view.zoom * 100)}%</output>
          <button type="button" onClick={() => updateZoom(view.zoom + 0.15)} aria-label="放大地圖"><Plus size={15} /></button>
        </div>
        <button type="button" onClick={() => setView((current) => ({ ...current, rotation: current.rotation - 15 }))} aria-label="逆時針旋轉地圖"><RotateCcw size={15} /><span>旋轉</span></button>
        <button type="button" onClick={() => setView((current) => ({ ...current, rotation: current.rotation + 15 }))} aria-label="順時針旋轉地圖"><RotateCw size={15} /></button>
        <button type="button" onClick={resetView} aria-label="重設地圖位置、縮放與角度"><span>重設</span></button>
      </div>
      <svg className="island-map-svg" viewBox="0 0 1000 680" role="group" aria-label="五座可互動的島嶼">
        <defs>
          <linearGradient id="island-sea" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#8bc4c5" />
            <stop offset="1" stopColor="#5e9faa" />
          </linearGradient>
          <radialGradient id="island-sea-glow" cx="50%" cy="42%" r="68%">
            <stop offset="0" stopColor="#d9e4c7" stopOpacity=".62" />
            <stop offset="1" stopColor="#d9e4c7" stopOpacity="0" />
          </radialGradient>
          <pattern id="island-water-ripples" width="170" height="118" patternUnits="userSpaceOnUse">
            <path d="M 16 31 q 20 -7 42 0 M 100 83 q 19 -6 38 0 M 50 108 q 13 -4 24 0" fill="none" stroke="#d6efdf" strokeOpacity=".24" strokeWidth="2" strokeLinecap="round" />
            <circle cx="141" cy="28" r="2.2" fill="#e7e9cf" fillOpacity=".48" />
          </pattern>
        </defs>

        <rect width="1000" height="680" fill="url(#island-sea)" />
        <rect width="1000" height="680" fill="url(#island-sea-glow)" />
        <rect width="1000" height="680" fill="url(#island-water-ripples)" />
        <g transform={`translate(${500 + view.x} ${340 + view.y}) rotate(${view.rotation}) scale(${view.zoom}) translate(-500 -340)`}>
          <ellipse cx="503" cy="340" rx="405" ry="250" fill="none" stroke="#d7ecda" strokeOpacity=".15" strokeWidth="2" />
          <ellipse cx="503" cy="340" rx="330" ry="203" fill="none" stroke="#d7ecda" strokeOpacity=".1" strokeWidth="2" />

          {/* 木橋連接各功能島，路徑作為地圖裝飾，不取代實際導航按鈕。 */}
          {bridgePaths.map((path, index) => (
          <g key={`bridge-${index}`} aria-hidden="true">
            <path d={path} fill="none" stroke="#806c52" strokeWidth="19" strokeLinecap="round" opacity=".56" />
            <path d={path} fill="none" stroke="#c69b64" strokeWidth="15" strokeLinecap="round" />
            <path d={path} fill="none" stroke="#f0dfb5" strokeWidth="2.2" strokeDasharray="5 9" strokeLinecap="round" />
          </g>
          ))}

        {/* 遠景小礁與航標 */}
          <g aria-hidden="true" opacity=".8">
          <path d="M 79 448 q 38 -28 80 -3 q 19 19 4 39 q -48 15 -84 -2 Z" fill="#d7c89b" />
          <path d="M 831 151 q 43 -31 80 -1 q 17 16 4 32 q -51 18 -82 -3 Z" fill="#d5c99e" />
          <path d="M 850 548 q 46 -24 77 4 q 10 22 -12 33 q -40 8 -65 -7 Z" fill="#d9c99c" />
          <path d="M 123 104 v 31" stroke="#795f47" strokeWidth="4" />
          <path d="M 115 104 h 16 l -8 -12 Z" fill="#ef9f5b" />
          <path d="M 894 354 v 31" stroke="#795f47" strokeWidth="4" />
          <path d="M 886 354 h 16 l -8 -12 Z" fill="#ef9f5b" />
          </g>

          {IDEAX_ISLANDS.map((island) => {
          const { x, y, size, land, edge } = island.mapPosition;
          const cx = x * 10;
          const cy = y * 6.8;
          const scale = ISLAND_SCALE[size];
          const isSelected = selectedIslandId === island.id;
          const islandShape = ISLAND_SHAPES[island.id] || DEFAULT_ISLAND_SHAPE;
          const count = contentCounts[island.id] || 0;
          const labelWidth = 178;
          const labelY = cy - 82 * scale;

          return (
            <g
              key={island.id}
              className={`island-map-node${isSelected ? ' is-selected' : ''}`}
              data-island-id={island.id}
              role="button"
              tabIndex={0}
              aria-label={`探索${island.name}，${island.districts.length}個區域`}
              aria-pressed={isSelected}
              onClick={() => {
                if (Date.now() < suppressClickUntil.current) return;
                onSelectIsland(island.id);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectIsland(island.id);
                }
              }}
            >
              <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
                <path d={islandShape} transform="translate(0 24)" fill="#345e5e" opacity=".32" />
                <path d={islandShape} transform="translate(0 12)" fill={edge} stroke="#f3e6c3" strokeWidth="5" strokeLinejoin="round" />
                <path d={islandShape} fill={land} stroke="#f5ebcf" strokeWidth="6" strokeLinejoin="round" />
                <path d={islandShape} fill="none" stroke="#ffffff" strokeOpacity=".38" strokeWidth="2" strokeDasharray="4 6" transform="scale(.91)" />
                <IslandLandmark tint={land} islandId={island.id} />
                <path d="M 104 6 l 39 8 v 7 l -40 -7 Z" fill="#b58152" stroke="#785d46" strokeWidth="2" />
                <path d="M 110 8 l 2 8 M 120 10 l 2 8 M 130 12 l 2 7" stroke="#f4dfb6" strokeWidth="2" />
              </g>
              <g className="island-map-label" transform={`translate(${cx - labelWidth / 2} ${labelY})`}>
                <rect width={labelWidth} height="38" rx="19" />
                <text className="island-label-icon" x="17" y="25">{island.icon}</text>
                <text className="island-label-name" x="40" y="25">{island.name}</text>
                {count > 0 && <text className="island-label-count" x={labelWidth - 13} y="24" textAnchor="end">{count}</text>}
              </g>
              <circle className="island-map-ring" cx={cx} cy={cy} r={size === 'large' ? 123 : 100} />
            </g>
          );
          })}
        </g>
      </svg>
      <div className="island-map-hint"><Compass size={15} /> 左鍵拖曳移動 · 右鍵拖曳轉向 · 滾輪縮放</div>
    </div>
  );
}

function getQuestionsForStand(questions: Question[], selectedStand: IslandStand): Question[] {
  return questions.filter((question) => matchesIslandContent(question, selectedStand.contentFilter));
}

function findSearchResults(questions: Question[], query: string): Question[] {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return [];
  return questions
    .filter((question) => question.status !== 'delisted')
    .filter((question) => [question.title, question.appName, question.description, question.category, question.subcategory, question.tertiaryCategory, ...(question.tags || [])]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase()
      .includes(term))
    .slice(0, 8);
}

function ContentQuestionCard({ question, onClick }: { question: Question; onClick: (question: Question) => void }) {
  const media = question.coverImage || question.cardDisplayImage;
  return (
    <article className="island-content-card">
      {media && (
        <img
          src={media}
          alt=""
          loading="lazy"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
      )}
      <div className="island-content-copy">
        <p className="island-content-meta">{question.category}{question.tertiaryCategory ? ` · ${question.tertiaryCategory}` : ''}</p>
        <h3>{question.title}</h3>
        <p className="island-content-description">{question.description}</p>
        <button type="button" onClick={() => onClick(question)} className="island-open-content">
          查看原貼文 <ArrowRight size={14} />
        </button>
      </div>
    </article>
  );
}

function SceneIllustration({ scene }: { scene: IslandStand }) {
  return (
    <div className={`island-scene-art palette-${scene.palette} template-${scene.sceneTemplateId}`} aria-label={`${scene.sceneMood}場景`} role="img">
      <div className="island-scene-sky" />
      <div className="island-scene-stage">
        <div className="scene-structure scene-structure-back" />
        <div className="scene-structure scene-structure-front" />
        <div className="scene-props" aria-hidden="true">
          <i /><i /><i />
        </div>
      </div>
      <div className="island-scene-art-label">{scene.sceneMood}</div>
    </div>
  );
}

function GuideNpc({ scene, onAction }: { scene: IslandStand; onAction: (action: IslandAction) => void }) {
  return (
    <section className="island-npc-guide" aria-label="場景導覽員">
      <div className="island-npc-avatar" aria-hidden="true">{scene.npcProfile.name.slice(0, 1)}</div>
      <div className="island-npc-copy">
        <p className="island-npc-role">{scene.npcProfile.role}</p>
        <h3>{scene.npcProfile.name}</h3>
        <p>{scene.interactionPrompt}</p>
      </div>
      <button type="button" onClick={() => onAction(scene.npcProfile.action)} className="island-npc-action">
        {scene.npcProfile.actionLabel}<ArrowRight size={14} />
      </button>
    </section>
  );
}

export const IslandWorldView: React.FC<IslandWorldViewProps> = ({ questions, onOpenQuestion, onAction }) => {
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedStreetId, setSelectedStreetId] = useState<string | null>(null);
  const [selectedStandId, setSelectedStandId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  const selectedIsland = IDEAX_ISLANDS.find((island) => island.id === selectedIslandId) || null;
  const selectedDistrict = selectedIsland?.districts.find((district) => district.id === selectedDistrictId) || null;
  const selectedStreet = selectedDistrict?.streets.find((street) => street.id === selectedStreetId) || null;
  const selectedStand = selectedStreet?.stands.find((item) => item.id === selectedStandId) || null;

  const contentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const island of IDEAX_ISLANDS) {
      counts[island.id] = island.districts.reduce((sum, district) => sum + district.streets.reduce((streetSum, street) => streetSum + street.stands.reduce((standSum, item) => standSum + (item.contentKind === 'questions' ? getQuestionsForStand(questions, item).length : 0), 0), 0), 0);
    }
    return counts;
  }, [questions]);

  const sceneQuestions = useMemo(() => selectedStand ? getQuestionsForStand(questions, selectedStand) : [], [questions, selectedStand]);
  const searchResults = useMemo(() => findSearchResults(questions, searchText), [questions, searchText]);

  const resetToIsland = (island: IdeaXIsland) => {
    setSelectedIslandId(island.id);
    setSelectedDistrictId(null);
    setSelectedStreetId(null);
    setSelectedStandId(null);
  };

  const goBackOneLevel = () => {
    if (selectedStandId) setSelectedStandId(null);
    else if (selectedStreetId) setSelectedStreetId(null);
    else if (selectedDistrictId) setSelectedDistrictId(null);
    else setSelectedIslandId(null);
  };

  const handleAction = (action: IslandAction) => {
    onAction(action);
  };

  return (
    <div className="island-world-page">
      <div className="island-world-layout">
        <section className="island-map-column">
          <ArchipelagoMap selectedIslandId={selectedIslandId} contentCounts={contentCounts} onSelectIsland={(id) => {
            const island = IDEAX_ISLANDS.find((item) => item.id === id);
            if (island) resetToIsland(island);
          }} />
          <div className="island-map-legend" aria-label="地圖圖例">
            <span><i className="legend-land" /> 點島就能逛</span>
            <span><i className="legend-bridge" /> 木橋</span>
            <span>{IDEAX_ISLANDS.length} 座島</span>
          </div>
        </section>

        <aside className="island-atlas-panel">
          <div className="island-atlas-topline"><span><MapPin size={14} /> 島上有什麼</span><span>{selectedIsland?.shortName || '五座島'}</span></div>
          <label className="island-search-box">
            <Search size={16} aria-hidden="true" />
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="搜尋問題、作品或主題" aria-label="搜尋問題、作品或主題" />
            {searchText && <button type="button" onClick={() => setSearchText('')} aria-label="清除搜尋">×</button>}
          </label>

          {searchText.trim() ? (
            <div className="island-search-results">
              <h2>搜尋結果 <span>{searchResults.length}</span></h2>
              {searchResults.length ? searchResults.map((question) => (
                <button key={question.id} type="button" onClick={() => onOpenQuestion(question)} className="island-search-result">
                  <span>{question.category}</span><strong>{question.title}</strong><ChevronRight size={15} />
                </button>
              )) : <p className="island-empty-note">目前找不到符合的公開內容。</p>}
            </div>
          ) : selectedStand ? (
            <ScenePanel scene={selectedStand} questions={sceneQuestions} onOpenQuestion={onOpenQuestion} onAction={handleAction} onBack={() => setSelectedStandId(null)} />
          ) : (
            <HierarchyPanel
              island={selectedIsland}
              district={selectedDistrict}
              street={selectedStreet}
              onSelectIsland={resetToIsland}
              onSelectDistrict={(district: IslandDistrict) => { setSelectedDistrictId(district.id); setSelectedStreetId(null); setSelectedStandId(null); }}
              onSelectStreet={(street: IslandStreet) => { setSelectedStreetId(street.id); setSelectedStandId(null); }}
              onSelectStand={(item: IslandStand) => setSelectedStandId(item.id)}
              onBack={goBackOneLevel}
              onAction={handleAction}
              questions={questions}
            />
          )}
        </aside>
      </div>
    </div>
  );
};

function HierarchyPanel({
  island,
  district,
  street,
  onSelectIsland,
  onSelectDistrict,
  onSelectStreet,
  onSelectStand,
  onBack,
  onAction,
  questions,
}: {
  island: IdeaXIsland | null;
  district: IslandDistrict | null;
  street: IslandStreet | null;
  onSelectIsland: (island: IdeaXIsland) => void;
  onSelectDistrict: (district: IslandDistrict) => void;
  onSelectStreet: (street: IslandStreet) => void;
  onSelectStand: (stand: IslandStand) => void;
  onBack: () => void;
  onAction: (action: IslandAction) => void;
  questions: Question[];
}) {
  const currentTitle = street ? street.name : district ? district.name : island ? island.name : '五座島嶼';
  const items = street ? street.stands : district ? district.streets : island ? island.districts : IDEAX_ISLANDS;
  const subtitle = street?.subtitle || district?.subtitle || island?.subtitle || '從主島、創意島、痛點島、討論島或徵才島開始。';

  return (
    <div className="island-hierarchy-view">
      {(island || district || street) && (
        <button type="button" onClick={onBack} className="island-back-link"><ArrowLeft size={14} /> 回上一層</button>
      )}
      <div className="island-breadcrumbs" aria-label="探索層級">
        <span>島</span>{island && <><ChevronRight size={13} /><span>區</span></>}{district && <><ChevronRight size={13} /><span>街</span></>}{street && <><ChevronRight size={13} /><span>攤</span></>}
      </div>
      <h2>{currentTitle}</h2>
      <p className="island-hierarchy-subtitle">{subtitle}</p>
      <div className="island-hierarchy-list">
        {!island && IDEAX_ISLANDS.map((item) => <IslandChoice key={item.id} island={item} count={item.districts.length} onClick={() => onSelectIsland(item)} />)}
        {island && !district && island.districts.map((item) => <HierarchyChoice key={item.id} icon={<Building2 size={17} />} title={item.name} subtitle={item.subtitle} hint={`${item.streets.length} 條主題街`} onClick={() => onSelectDistrict(item)} />)}
        {district && !street && district.streets.map((item) => <HierarchyChoice key={item.id} icon={<Route size={17} />} title={item.name} subtitle={item.subtitle} hint={`${item.stands.length} 個場景攤`} onClick={() => onSelectStreet(item)} />)}
        {street && street.stands.map((item) => {
          const count = item.contentKind === 'questions' ? getQuestionsForStand(questions, item).length : 0;
          const Icon = item.contentKind === 'jobs' ? BriefcaseBusiness : item.contentKind === 'experts' ? Users : item.displayTemplate === 'game_table' ? Gamepad2 : item.displayTemplate === 'scrolls' ? ScrollText : item.displayTemplate === 'guild_roster' ? Users : item.displayTemplate === 'job_board' ? BriefcaseBusiness : item.displayTemplate === 'exhibits' ? PanelsTopLeft : BookOpen;
          return <HierarchyChoice key={item.id} icon={<Icon size={17} />} title={item.name} subtitle={item.summary} hint={item.contentKind === 'questions' ? `${count} 則公開內容` : item.contentKind === 'jobs' ? '使用既有職缺搜尋' : '使用既有專家名冊'} onClick={() => onSelectStand(item)} />;
        })}
      </div>
      {!island && <div className="island-guide-tip"><span>點選地圖上的島嶼或清單項目，開始探索。</span></div>}
      {island && !district && <button type="button" className="island-panel-secondary" onClick={() => onAction(island.id === 'career' ? 'jobs' : island.id === 'pain' ? 'pain_feed' : island.id === 'discussion' ? 'discussion_feed' : island.id === 'creative' ? 'vibecoding_feed' : 'home')}>開啟原有功能入口 <ArrowRight size={14} /></button>}
    </div>
  );
}

function IslandChoice({ island, count, onClick }: { island: IdeaXIsland; count: number; onClick: () => void }) {
  return (
    <button type="button" className="island-choice" onClick={onClick}>
      <span className="island-choice-icon" style={{ backgroundColor: island.mapPosition.land }}>{island.icon}</span>
      <span className="island-choice-copy"><strong>{island.name}</strong><small>{island.subtitle}</small></span>
      <span className="island-choice-count">{count} 區<ChevronRight size={15} /></span>
    </button>
  );
}

function HierarchyChoice({ icon, title, subtitle, hint, onClick }: { icon: React.ReactNode; title: string; subtitle: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" className="island-hierarchy-choice" onClick={onClick}>
      <span className="hierarchy-choice-icon">{icon}</span>
      <span className="hierarchy-choice-copy"><strong>{title}</strong><small>{subtitle}</small><em>{hint}</em></span>
      <ChevronRight size={17} className="hierarchy-choice-chevron" />
    </button>
  );
}

function ScenePanel({ scene, questions, onOpenQuestion, onAction, onBack }: { scene: IslandStand; questions: Question[]; onOpenQuestion: (question: Question) => void; onAction: (action: IslandAction) => void; onBack: () => void }) {
  return (
    <div className="island-scene-panel">
      <button type="button" className="island-back-link" onClick={onBack}><ArrowLeft size={14} /> 回到街道</button>
      <div className="island-breadcrumbs"><span>攤位場景</span><ChevronRight size={13} /><span>{scene.name}</span></div>
      <h2>{scene.name}</h2>
      <p className="island-hierarchy-subtitle">{scene.summary}</p>
      <SceneIllustration scene={scene} />
      <GuideNpc scene={scene} onAction={onAction} />
      {scene.contentKind === 'questions' ? (
        <section className="island-scene-content">
          <div className="island-content-heading"><h3>此處的公開內容</h3><span>{questions.length} 則</span></div>
          {questions.length ? <div className="island-content-list">{questions.slice(0, 8).map((question) => <ContentQuestionCard key={question.id} question={question} onClick={onOpenQuestion} />)}</div> : <p className="island-empty-note">目前沒有符合此場景的公開內容。可以沿用既有發布功能新增內容，完成後會依分類顯示在這裡。</p>}
        </section>
      ) : (
        <section className="island-linked-service">
          <span className="linked-service-icon">{scene.contentKind === 'jobs' ? <Compass size={18} /> : <Users size={18} />}</span>
          <div><strong>{scene.contentKind === 'jobs' ? '連接真實職缺搜尋' : '連接 IdeaX 專家名冊'}</strong><p>{scene.contentKind === 'jobs' ? '推薦場景只負責導覽，搜尋結果由原有職缺服務提供。' : '此入口會開啟現有專家智庫，不產生虛構人物或媒合結果。'}</p></div>
          <button type="button" onClick={() => onAction(scene.npcProfile.action)}>{scene.npcProfile.actionLabel}<ArrowRight size={14} /></button>
        </section>
      )}
    </div>
  );
}
