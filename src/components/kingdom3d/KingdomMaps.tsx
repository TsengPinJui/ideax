import React from 'react';
import { X } from 'lucide-react';
import { RegionId } from './types';
import { REGION_CONFIGS, ALL_REGION_IDS, WORLD_BRIDGES } from './regionConfigs';
import { STREET_PROPS } from './stylized/streets';
import { TULOU_RADIUS } from './stylized/tulou';
import { BASIN_LANDMARKS, MOUNTAIN_RING, FARMLANDS, landOutline } from './stylized/basinLayout';
import { DOCKS, TRAIL } from './stylized/docks';

/** 遠景地標（與 StylizedWorld 的位置一致） */
const LANDMARKS = {
  north: BASIN_LANDMARKS.northFalls,
  west: BASIN_LANDMARKS.westPlateau,
  south: BASIN_LANDMARKS.southCave,
  east: BASIN_LANDMARKS.eastFalls,
  lake: BASIN_LANDMARKS.lakePavilion,
};

const INK = '#4a3420';
const LAND = '#d9dfb4';
const LAND_EDGE = '#6b5a3a';

function Pagoda({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M ${-6 + i} ${-i * 4} L ${6 - i} ${-i * 4} L ${4.5 - i} ${-i * 4 - 2.4} L ${-4.5 + i} ${-i * 4 - 2.4} Z`} fill="#8e2a20" stroke={INK} strokeWidth={0.5} />
      ))}
      <line x1={0} y1={-20} x2={0} y2={-24} stroke="#b8862b" strokeWidth={0.9} />
    </g>
  );
}

function Pavilion({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -6 -1 Q 0 -7 6 -1 L 4 -3 Q 0 -6 -4 -3 Z" fill="#2c5a50" stroke={INK} strokeWidth={0.5} />
      <line x1={-3} y1={-1} x2={-3} y2={3} stroke="#8e2a20" strokeWidth={0.9} />
      <line x1={3} y1={-1} x2={3} y2={3} stroke="#8e2a20" strokeWidth={0.9} />
      <line x1={-4.5} y1={3} x2={4.5} y2={3} stroke={INK} strokeWidth={0.8} />
    </g>
  );
}

/** 乘船點：藍底白框圓章＋小船（小地圖會跟著轉，圖示另外轉回正） */
function DockMarker({ x, y, s, rot, label }: { x: number; y: number; s: number; rot: number; label: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} style={{ pointerEvents: 'none' }}>
      <circle r={5.2} fill="rgba(14,116,144,0.28)" />
      <circle r={4} fill="#0e7490" stroke="#fff6dc" strokeWidth={1} />
      {/* 船身＋帆 */}
      <path d="M -2.7 0.9 L 2.7 0.9 L 1.8 2.1 L -1.8 2.1 Z" fill="#fff6dc" />
      <path d="M -0.1 0.5 L -0.1 -2.7 L 2 0.5 Z" fill="#fff6dc" />
      <path d="M -0.5 0.5 L -0.5 -2 L -2.1 0.5 Z" fill="#fde68a" />
      {label && (
        <text y={8.6} textAnchor="middle" fontSize={3.6} fontWeight={900} fill="#0b4f63" className="kx-serif" stroke="rgba(255,248,230,0.95)" strokeWidth={1.1} style={{ paintOrder: 'stroke' }}>
          乘船
        </text>
      )}
    </g>
  );
}

/** 登山口（往塔樓山台） */
function TrailMarker({ x, y, s, rot, label }: { x: number; y: number; s: number; rot: number; label: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} style={{ pointerEvents: 'none' }}>
      <circle r={4} fill="#5b6a3a" stroke="#fff6dc" strokeWidth={1} />
      <path d="M -2.6 2 L -0.6 -1.6 L 0.6 0.2 L 1.4 -0.8 L 2.8 2 Z" fill="#fff6dc" />
      {label && (
        <text y={8.6} textAnchor="middle" fontSize={3.6} fontWeight={900} fill="#3c4a22" className="kx-serif" stroke="rgba(255,248,230,0.95)" strokeWidth={1.1} style={{ paintOrder: 'stroke' }}>
          登山口
        </text>
      )}
    </g>
  );
}

/** 共用的地圖內容（世界座標 x、z 直接當 SVG 座標） */
export function WorldMapContent({
  activeRegionId,
  onSelectRegion,
  detail,
  iconRot = 0,
}: {
  activeRegionId: RegionId;
  onSelectRegion?: (id: RegionId) => void;
  detail: 'full' | 'mini';
  /** 小地圖會整張旋轉：圖示反向轉回正 */
  iconRot?: number;
}) {
  const full = detail === 'full';
  return (
    <g>
      {/* 環形群山（盆地） */}
      {MOUNTAIN_RING.map((p) => (
        <g key={p.i}>
          <circle cx={p.x} cy={p.z} r={p.r * 0.92} fill={p.kind === 'westPlateau' ? '#a9b48a' : '#8fa27a'} stroke={LAND_EDGE} strokeWidth={1} />
          {full && <path d={`M ${p.x - p.r * 0.5} ${p.z + p.r * 0.25} L ${p.x} ${p.z - p.r * 0.45} L ${p.x + p.r * 0.5} ${p.z + p.r * 0.25}`} fill="none" stroke="rgba(60,70,50,0.55)" strokeWidth={1.4} />}
        </g>
      ))}
      {/* 田園陸地 */}
      {FARMLANDS.map((l, i) => (
        <g key={i}>
          <polygon points={landOutline(l, 32).map(([x, z]) => `${x},${z}`).join(' ')} fill="#c7cf8e" stroke={LAND_EDGE} strokeWidth={1} />
          <polygon points={landOutline({ ...l, rx: l.rx * 0.8, rz: l.rz * 0.8 }, 32).map(([x, z]) => `${x},${z}`).join(' ')} fill="url(#kx-paddy)" opacity={0.85} />
        </g>
      ))}
      <Pagoda x={LANDMARKS.west.x + 2} y={LANDMARKS.west.z + 4} s={full ? 1.4 : 1.8} />
      {/* 北山飛瀑、東山飛瀑、南山洞口 */}
      <path d={`M 0 ${LANDMARKS.north.faceZ - 12} q 1.5 10 0 22`} stroke="#5fa6c4" strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d={`M ${LANDMARKS.east.faceX + 6} ${LANDMARKS.east.z} q -8 1 -16 0`} stroke="#5fa6c4" strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <path d={`M -10 ${LANDMARKS.south.faceZ + 3} a 10 9 0 0 1 20 0 Z`} fill="#2b2620" />
      <ellipse cx={LANDMARKS.lake.x} cy={LANDMARKS.lake.z} rx={22} ry={11} fill="rgba(110,160,90,0.18)" />
      {Array.from({ length: 16 }).map((_, i) => (
        <circle key={i} cx={Math.cos(i * 2.4) * (8 + (i % 4) * 4)} cy={LANDMARKS.lake.z + Math.sin(i * 2.4) * (4 + (i % 3) * 2.5)} r={1.6} fill="#5f8f45" opacity={0.85} />
      ))}
      <Pavilion x={LANDMARKS.lake.x} y={LANDMARKS.lake.z} s={full ? 1.1 : 1.4} />

      {/* 石拱橋 */}
      {WORLD_BRIDGES.map((b) => (
        <g key={b.id}>
          <line x1={b.x1} y1={b.z1} x2={b.x2} y2={b.z2} stroke={INK} strokeWidth={b.halfWidth * 2 + 1.6} strokeLinecap="round" />
          <line x1={b.x1} y1={b.z1} x2={b.x2} y2={b.z2} stroke="#e8dcc0" strokeWidth={b.halfWidth * 2 - 0.6} strokeLinecap="round" />
        </g>
      ))}

      {/* 五島 */}
      {ALL_REGION_IDS.map((rid) => {
        const r = REGION_CONFIGS[rid];
        const [cx, cz] = r.center;
        const isAct = rid === activeRegionId;
        return (
          <g key={rid} onClick={onSelectRegion ? () => onSelectRegion(rid) : undefined} style={{ cursor: onSelectRegion ? 'pointer' : undefined }}>
            <ellipse cx={cx} cy={cz} rx={r.islandRadiusX + 6} ry={r.islandRadiusZ + 6} fill="#a8bf86" stroke={LAND_EDGE} strokeWidth={1.4} />
            <ellipse cx={cx} cy={cz} rx={r.islandRadiusX} ry={r.islandRadiusZ} fill={LAND} stroke={isAct ? '#b3261e' : 'rgba(107,90,58,0.6)'} strokeWidth={isAct ? 2.2 : 0.8} strokeDasharray={isAct ? undefined : '3 2'} />
            <circle cx={cx} cy={cz} r={r.plazaRadius} fill="#efe6cf" stroke="rgba(107,90,58,0.45)" strokeWidth={0.8} />
            {rid === 'region-career' && <rect x={48} y={28} width={48} height={40} fill="none" stroke="#8a7a62" strokeWidth={1.4} />}
            {r.buildings
              .filter((b) => b.exterior === 'tulou')
              .map((b) => (
                <g key={`${b.id}-tulou`}>
                  <circle cx={b.position.x} cy={b.position.z} r={TULOU_RADIUS} fill="#c9a47a" stroke={INK} strokeWidth={0.9} />
                  <circle cx={b.position.x} cy={b.position.z} r={11} fill="#efe6cf" stroke={INK} strokeWidth={0.6} />
                </g>
              ))}
            {r.buildings.filter((b) => b.exterior !== 'tulou').map((b) => (
              <g key={b.id} transform={`translate(${b.position.x} ${b.position.z}) rotate(${(-b.facingYaw * 180) / Math.PI})`}>
                <rect x={-b.width / 2} y={-b.depth / 2} width={b.width} height={b.depth} fill="#9b3a2c" stroke={INK} strokeWidth={0.8} rx={0.8} />
                <rect x={-b.width / 2 + 1.2} y={-b.depth / 2 + 1.2} width={b.width - 2.4} height={b.depth - 2.4} fill="none" stroke="#d9a94a" strokeWidth={0.5} />
              </g>
            ))}
            {STREET_PROPS[rid].map((p) => (
              <g key={p.id} transform={`translate(${p.x} ${p.z}) rotate(${(-p.yaw * 180) / Math.PI})`}>
                {p.kind === 'gate' ? (
                  <rect x={-p.w / 2} y={-0.5} width={p.w} height={1} fill="#b3261e" stroke={INK} strokeWidth={0.4} />
                ) : p.kind === 'board' ? (
                  <rect x={-p.w / 2} y={-p.d / 2} width={p.w} height={p.d} fill="#8a4b22" stroke="#f5d07a" strokeWidth={0.35} rx={0.2} />
                ) : (
                  <rect x={-p.w / 2} y={-p.d / 2} width={p.w} height={p.d} fill={p.kind === 'shop' ? '#b86b3c' : '#d9a94a'} stroke={INK} strokeWidth={0.5} rx={0.4} />
                )}
              </g>
            ))}
            {full && rid === 'region-home' && (
              <text x={-23} y={1.2} textAnchor="middle" fontSize={3} fill={INK} className="kx-serif" fontWeight={700} transform="rotate(-90 -23 0)">
                商店街
              </text>
            )}
            {full &&
              STREET_PROPS[rid]
                .filter((p) => p.kind === 'gate')
                .map((p) => (
                  <text key={`${p.id}-t`} x={p.x} y={p.z - 15} textAnchor="middle" fontSize={3.6} fill={INK} className="kx-serif" fontWeight={700}>
                    {p.regionId === 'region-creative' ? `${p.name}市集` : p.name}
                  </text>
                ))}
            {full &&
              r.buildings.map((b) => (
                <text key={`${b.id}-t`} x={b.position.x} y={b.position.z + Math.max(b.width, b.depth) / 2 + 4.5} textAnchor="middle" fontSize={3.6} fill={INK} className="kx-serif" fontWeight={700}>
                  {b.name.replace(/[（(].*$/, '')}
                </text>
              ))}
            {r.landmark && <circle cx={r.landmark.x} cy={r.landmark.z} r={2.2} fill="#f2c94c" stroke={INK} strokeWidth={0.6} />}
            <text x={cx} y={cz - r.islandRadiusZ - 9} textAnchor="middle" fontSize={full ? 9 : 13} fill={isAct ? '#8e1f17' : INK} fontWeight={900} className="kx-serif">
              {r.name}
            </text>
          </g>
        );
      })}
      {/* 乘船點、登山口（畫在最上層，很明顯） */}
      {DOCKS.map((d) => (
        <g key={d.id} data-dock={d.id}>
          <line x1={d.landX} y1={d.landZ} x2={d.waterX} y2={d.waterZ} stroke="#7a5532" strokeWidth={1.6} strokeLinecap="round" />
          <DockMarker x={d.waterX} y={d.waterZ} s={full ? 1.7 : 1.4} rot={iconRot} label={full} />
        </g>
      ))}
      <TrailMarker x={TRAIL.x} y={TRAIL.z} s={full ? 1.5 : 1.25} rot={iconRot} label={full} />
      {full && (
        <g className="kx-serif" fontSize={6} fill={INK} fontWeight={700} textAnchor="middle">
          <text x={0} y={LANDMARKS.north.faceZ + 16}>{LANDMARKS.north.name}</text>
          <text x={LANDMARKS.west.x + 2} y={LANDMARKS.west.z + 18}>{LANDMARKS.west.name}</text>
          <text x={LANDMARKS.east.faceX - 14} y={LANDMARKS.east.z + 3}>{LANDMARKS.east.name}</text>
          <text x={0} y={LANDMARKS.south.faceZ - 6}>{LANDMARKS.south.name}</text>
          <text x={LANDMARKS.lake.x} y={LANDMARKS.lake.z + 15}>{LANDMARKS.lake.name}</text>
          <text x={-100} y={-112} fontSize={5} fill="#5b6a3a">田園</text>
          <text x={100} y={-112} fontSize={5} fill="#5b6a3a">田園</text>
        </g>
      )}
    </g>
  );
}

function PlayerArrow({ x, y, yawRad, size = 6 }: { x: number; y: number; yawRad: number; size?: number }) {
  // 前進方向（世界）＝(-sin yaw, -cos yaw)；SVG 的 y 就是世界 z
  const deg = (Math.atan2(-Math.cos(yawRad), -Math.sin(yawRad)) * 180) / Math.PI + 90;
  return (
    <g transform={`translate(${x} ${y}) rotate(${deg})`}>
      <circle r={size * 1.25} fill="rgba(179,38,30,0.18)" />
      <path d={`M 0 ${-size * 1.2} L ${size * 0.75} ${size * 0.8} L 0 ${size * 0.35} L ${-size * 0.75} ${size * 0.8} Z`} fill="#b3261e" stroke="#fff4d6" strokeWidth={size * 0.18} strokeLinejoin="round" />
    </g>
  );
}

/** 羈絆夥伴在地圖上的位置標記 */
function BondPartnerMarker({ x, y, name, size, showName = false }: { x: number; y: number; name: string; size: number; showName?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} style={{ pointerEvents: 'none' }}>
      <circle r={size * 1.65} fill="rgba(236,72,153,0.24)" />
      <circle r={size} fill="#db2777" stroke="#fff6dc" strokeWidth={size * 0.22} />
      <text y={size * 0.37} textAnchor="middle" fontSize={size * 1.05} fill="#fff6dc" fontWeight={900}>♥</text>
      {showName && (
        <text y={size * 2.7} textAnchor="middle" fontSize={5} fill="#831843" fontWeight={900} className="kx-serif" stroke="rgba(255,248,230,0.95)" strokeWidth={1.4} style={{ paintOrder: 'stroke' }}>
          {name}
        </text>
      )}
    </g>
  );
}

/** 右上角的圓形小地圖：以玩家為中心、面向方向朝上（像羅盤） */
export function CompassMinimap({
  playerPos,
  yawRad,
  activeRegionId,
  size,
  bondedPartner,
  onOpen,
}: {
  playerPos: { x: number; z: number };
  yawRad: number;
  activeRegionId: RegionId;
  size: number;
  bondedPartner?: { name: string; x: number; z: number } | null;
  onOpen: () => void;
}) {
  const R = 46; // 半徑（世界公尺）
  // 地圖固定北方朝上，只有中間的玩家箭頭跟著面向轉動
  const yawDeg = 0;
  const labels: [string, number][] = [
    ['北', 0],
    ['東', 90],
    ['南', 180],
    ['西', 270],
  ];
  return (
    <button type="button" onClick={onOpen} className="kx-minimap block relative" style={{ width: size, height: size }} title="開啟全島地圖">
      <svg viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`} width={size} height={size} className="block">
        <defs>
          <pattern id="kx-paddy" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="#9fbf6a" />
            <path d="M0 5 H10 M5 0 V10" stroke="#d8c48a" strokeWidth="1.2" />
          </pattern>
          <clipPath id="kx-mini-clip">
            <circle r={R} />
          </clipPath>
          <radialGradient id="kx-sea" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3c7c84" />
            <stop offset="100%" stopColor="#1d4a55" />
          </radialGradient>
        </defs>
        <g clipPath="url(#kx-mini-clip)">
          <circle r={R} fill="url(#kx-sea)" />
          <g transform={`rotate(${yawDeg}) translate(${-playerPos.x} ${-playerPos.z})`}>
            <WorldMapContent activeRegionId={activeRegionId} detail="mini" iconRot={-yawDeg} />
            {bondedPartner && <BondPartnerMarker x={bondedPartner.x} y={bondedPartner.z} name={bondedPartner.name} size={3.8} />}
          </g>
        </g>
        {/* 外圈刻度與方位 */}
        <circle r={R - 1} fill="none" stroke="rgba(30,17,10,0.55)" strokeWidth={5} />
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return <line key={i} x1={Math.sin(a) * (R - 3.5)} y1={-Math.cos(a) * (R - 3.5)} x2={Math.sin(a) * (R - (i % 6 === 0 ? 0.5 : 1.6))} y2={-Math.cos(a) * (R - (i % 6 === 0 ? 0.5 : 1.6))} stroke="#e2b85a" strokeWidth={i % 6 === 0 ? 1.2 : 0.6} />;
        })}
        {labels.map(([t, deg]) => {
          const a = (deg * Math.PI) / 180;
          return (
            <text key={t} x={Math.sin(a) * (R - 9)} y={-Math.cos(a) * (R - 9) + 3} textAnchor="middle" fontSize={8} fontWeight={900} fill={t === '北' ? '#ffcf6a' : '#f6e7c4'} className="kx-serif" style={{ paintOrder: 'stroke' }} stroke="rgba(20,10,5,0.8)" strokeWidth={2}>
              {t}
            </text>
          );
        })}
        <PlayerArrow x={0} y={0} yawRad={yawRad} size={5} />
      </svg>
    </button>
  );
}

/** 全島地圖（羊皮紙水墨風），點島嶼可直接前往 */
export function WorldMapModal({
  open,
  onClose,
  activeRegionId,
  playerPos,
  yawRad,
  bondedPartner,
  onSelectRegion,
  onGoToPoint,
}: {
  open: boolean;
  onClose: () => void;
  activeRegionId: RegionId;
  playerPos: { x: number; z: number };
  yawRad: number;
  bondedPartner?: { name: string; x: number; z: number } | null;
  onSelectRegion: (id: RegionId) => void;
  /** 點地圖任一處：前往最近可以去的地方（世界座標） */
  onGoToPoint?: (x: number, z: number) => void;
}) {
  if (!open) return null;
  const pickPoint = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onGoToPoint) return;
    const svg = e.currentTarget;
    const m = svg.getScreenCTM();
    if (!m) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(m.inverse());
    e.stopPropagation();
    e.preventDefault();
    // 點在乘船點圖示附近：直接走到那個渡口岸邊
    const dock = DOCKS.find((d) => Math.hypot(d.waterX - p.x, d.waterZ - p.y) < 7 || Math.hypot(d.landX - p.x, d.landZ - p.y) < 3);
    if (dock) {
      onGoToPoint(dock.landX, dock.landZ);
      onClose();
      return;
    }
    onGoToPoint(p.x, p.y);
    onClose();
  };
  return (
    <div className="kx-root fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/55 backdrop-blur-sm pointer-events-auto" onClick={onClose}>
      <div className="kx-parchment relative w-full max-w-4xl rounded-2xl p-3 sm:p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-1 pb-2">
          <div>
            <h3 className="kx-serif text-xl sm:text-2xl font-black tracking-wider" style={{ color: '#5a2a14' }}>
              創點源・五島全圖
            </h3>
            <p className="text-[12.5px]" style={{ color: '#6b5236' }}>
              點地圖任一處就能前往（點到水上會到最近的水邊）；紅色箭頭是你的位置與面向；{bondedPartner ? '粉色心形是羈絆夥伴的位置；' : ''}藍色船章是乘船點
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/10 cursor-pointer" aria-label="關閉地圖" style={{ color: '#5a2a14' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <svg viewBox="-215 -195 430 390" className="w-full h-auto block rounded-xl cursor-crosshair" style={{ maxHeight: '72vh' }} onClickCapture={onGoToPoint ? pickPoint : undefined}>
          <defs>
            <pattern id="kx-paddy" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" fill="#9fbf6a" />
              <path d="M0 5 H10 M5 0 V10" stroke="#d8c48a" strokeWidth="1.2" />
            </pattern>
            <pattern id="kx-waves" width="22" height="12" patternUnits="userSpaceOnUse">
              <path d="M 0 9 Q 5.5 3 11 9 Q 16.5 15 22 9" fill="none" stroke="rgba(70,110,120,0.22)" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect x={-215} y={-195} width={430} height={390} fill="rgba(160,200,200,0.28)" />
          <rect x={-215} y={-195} width={430} height={390} fill="url(#kx-waves)" />
          <WorldMapContent
            activeRegionId={activeRegionId}
            detail="full"
            onSelectRegion={(id) => {
              onSelectRegion(id);
              onClose();
            }}
          />
          <PlayerArrow x={playerPos.x} y={playerPos.z} yawRad={yawRad} size={4.5} />
          {bondedPartner && <BondPartnerMarker x={bondedPartner.x} y={bondedPartner.z} name={bondedPartner.name} size={4.5} showName />}
          {/* 羅盤 */}
          <g transform="translate(195 175)" className="kx-serif">
            <circle r={15} fill="rgba(255,248,230,0.7)" stroke={INK} strokeWidth={0.8} />
            <path d="M 0 -13 L 3 0 L 0 13 L -3 0 Z" fill="#8e1f17" />
            <path d="M -13 0 L 0 3 L 13 0 L 0 -3 Z" fill={INK} opacity={0.75} />
            <text y={-16.5} textAnchor="middle" fontSize={6} fontWeight={900} fill="#8e1f17">北</text>
          </g>
        </svg>
      </div>
    </div>
  );
}
