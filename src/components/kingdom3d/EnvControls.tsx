import React, { useEffect, useRef, useState } from 'react';
import { Sun, Moon, Sunset, CloudRain, Volume2, VolumeX, X } from 'lucide-react';
import './kingdomUi.css';

export type TimeMode = 'auto' | 'day' | 'dusk' | 'night';
export type WeatherMode = 'auto' | 'clear' | 'rain';

const TIME_OPTS: { v: TimeMode; label: string }[] = [
  { v: 'auto', label: '自動' },
  { v: 'day', label: '白天' },
  { v: 'dusk', label: '黃昏' },
  { v: 'night', label: '夜晚' },
];
const WEATHER_OPTS: { v: WeatherMode; label: string }[] = [
  { v: 'auto', label: '自動' },
  { v: 'clear', label: '晴天' },
  { v: 'rain', label: '雨天' },
];

/**
 * 小地圖下方的兩顆小鍵：時間與天氣（點開表單：選時段、天氣，或交給「自動」依所在地）、古風背景樂
 */
export const EnvControls: React.FC<{
  timeMode: TimeMode;
  weatherMode: WeatherMode;
  tod: 'day' | 'dusk' | 'night';
  weather: 'clear' | 'rain';
  onTimeMode: (m: TimeMode) => void;
  onWeatherMode: (m: WeatherMode) => void;
  bgmMuted?: boolean;
  onToggleBgm?: () => void;
  /** 自動模式時的說明（例如「依台北目前時間與天氣」） */
  autoHint?: string;
  align?: 'right' | 'left';
}> = ({ timeMode, weatherMode, tod, weather, onTimeMode, onWeatherMode, bgmMuted, onToggleBgm, autoHint, align = 'right' }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [open]);
  const icon =
    weather === 'rain' ? (
      <CloudRain className="w-3.5 h-3.5" />
    ) : tod === 'night' ? (
      <Moon className="w-3.5 h-3.5" />
    ) : tod === 'day' ? (
      <Sun className="w-3.5 h-3.5" />
    ) : (
      <Sunset className="w-3.5 h-3.5" />
    );
  const todLabel = tod === 'night' ? '夜晚' : tod === 'day' ? '白天' : '黃昏';
  const chip = (active: boolean) => ({
    background: active ? 'rgba(179,38,30,0.78)' : 'rgba(0,0,0,0.28)',
    border: `1px solid ${active ? 'rgba(242,198,106,0.85)' : 'rgba(226,184,90,0.28)'}`,
    color: '#f6e7c4',
  });
  return (
    <div ref={boxRef} className="kx-root relative flex items-center gap-1.5" data-ui-panel="true">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-on={open}
        className="kx-round w-7 h-7 sm:w-8 sm:h-8"
        title={`時間與天氣：${todLabel}・${weather === 'rain' ? '雨' : '晴'}（點開調整）`}
        aria-label="時間與天氣"
        aria-expanded={open}
      >
        {icon}
      </button>
      {onToggleBgm && (
        <button
          type="button"
          onClick={onToggleBgm}
          data-on={!bgmMuted}
          className="kx-round w-7 h-7 sm:w-8 sm:h-8"
          title={bgmMuted ? '開啟古風背景樂' : '關閉古風背景樂'}
          aria-label={bgmMuted ? '開啟古風背景樂' : '關閉古風背景樂'}
        >
          {bgmMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      )}
      {open && (
        <div className={`absolute top-full mt-1.5 ${align === 'right' ? 'right-0' : 'left-0'} w-56 z-40`}>
        <div className="kx-panel kx-corners p-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between">
            <span className="kx-title text-[14.5px]">時間與天氣</span>
            <button type="button" onClick={() => setOpen(false)} className="kx-round w-6 h-6" aria-label="關閉">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <p className="kx-sub text-[12px] mb-1">時段</p>
            <div className="grid grid-cols-4 gap-1">
              {TIME_OPTS.map((o) => (
                <button key={o.v} type="button" onClick={() => onTimeMode(o.v)} className="rounded-md py-1 text-[12.5px] cursor-pointer" style={chip(timeMode === o.v)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="kx-sub text-[12px] mb-1">天氣</p>
            <div className="grid grid-cols-3 gap-1">
              {WEATHER_OPTS.map((o) => (
                <button key={o.v} type="button" onClick={() => onWeatherMode(o.v)} className="rounded-md py-1 text-[12.5px] cursor-pointer" style={chip(weatherMode === o.v)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <p className="kx-sub text-[11.5px] leading-relaxed">{autoHint || '「自動」會跟著你所在城市的時間與即時天氣。'}晴天才有漁船、遊船、水燈與天燈。</p>
        </div>
        </div>
      )}
    </div>
  );
};
