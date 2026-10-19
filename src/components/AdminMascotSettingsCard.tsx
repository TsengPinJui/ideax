import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Lightbulb, RotateCcw, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AdminMascotRouteCheck } from './AdminMascotRouteCheck';
import {
  DEFAULT_MASCOT_CONFIG,
  MASCOT_LIMITS,
  MASCOT_PREVIEW_EVENT,
  normalizeMascotConfig,
  type MascotConfig,
} from './mascot/mascotConfig';

const previewOnSite = (cfg: MascotConfig, extra?: Record<string, unknown>) => {
  try {
    window.dispatchEvent(new CustomEvent(MASCOT_PREVIEW_EVENT, { detail: { ...cfg, ...extra } }));
  } catch {}
};

const sameConfig = (a: MascotConfig, b: MascotConfig) => JSON.stringify(a) === JSON.stringify(b);

const Toggle: React.FC<{ label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, hint, checked, onChange }) => (
  <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer">
    <span className="min-w-0">
      <span className="block text-xs sm:text-sm font-black text-stone-900">{label}</span>
      <span className="block text-[11px] text-stone-500 font-medium">{hint}</span>
    </span>
    <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span
      aria-hidden="true"
      className="relative shrink-0 w-11 h-6 rounded-full bg-stone-300 transition-colors peer-checked:bg-amber-500 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400 after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
    />
  </label>
);

const Slider: React.FC<{
  label: string; value: number; min: number; max: number; step: number; digits: number; low: string; high: string; onChange: (v: number) => void;
}> = ({ label, value, min, max, step, digits, low, high, onChange }) => (
  <div className="space-y-1">
    <label className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs sm:text-sm font-black text-stone-800">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 min-w-0 accent-amber-500 h-8" />
      <output className="w-11 shrink-0 text-right text-xs font-bold text-stone-500 tabular-nums">{value.toFixed(digits)}</output>
    </label>
    <div className="flex justify-between pl-[76px] pr-14 text-[11px] text-stone-400 font-medium"><span>{low}</span><span>{high}</span></div>
  </div>
);

/** 管理員儀表板：燈泡吉祥物設定（顯示開關、對話、想你天數、果凍手感），拖滑桿時右下角的吉祥物會即時套用 */
export const AdminMascotSettingsCard: React.FC = () => {
  const { mascotConfig, saveMascotConfig } = useApp();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MascotConfig>(mascotConfig);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const savedRef = useRef(mascotConfig);
  savedRef.current = mascotConfig;
  const dirty = !sameConfig(draft, mascotConfig);

  // 雲端設定被別處更新時，沒在編輯就同步
  useEffect(() => { if (!dirty) setDraft(mascotConfig); }, [mascotConfig]); // eslint-disable-line react-hooks/exhaustive-deps
  // 離開時若沒儲存，把右下角吉祥物還原成已儲存的設定
  useEffect(() => () => previewOnSite(savedRef.current), []);

  const update = (patch: Partial<MascotConfig>) => {
    setMsg('');
    setDraft((d) => {
      const next = normalizeMascotConfig({ ...d, ...patch });
      previewOnSite(next);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveMascotConfig(normalizeMascotConfig(draft));
      setMsg('已儲存，全站吉祥物即時更新。');
    } catch {
      setMsg('儲存失敗，請稍後再試。');
    } finally {
      setSaving(false);
    }
  };

  const status = [
    mascotConfig.enabled ? '顯示中' : '已關閉',
    mascotConfig.showOnMobile ? '含手機' : '僅電腦',
    mascotConfig.chatEnabled ? '對話開啟' : '對話關閉',
    mascotConfig.soundEnabled ? '音效開' : '音效關',
  ];

  return (
    <section className="p-3.5 sm:p-4.5 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-stone-50 border border-amber-200/90 shadow-2xs space-y-3" aria-labelledby="mascot-settings-title">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left select-none group"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-amber-400 text-stone-900 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            <Lightbulb className="w-5 h-5" />
          </span>
          <span className="min-w-0">
            <span id="mascot-settings-title" className="block font-black text-xs sm:text-sm text-stone-900">燈泡吉祥物設定</span>
            <span className="block text-[11px] text-stone-500 font-medium">右下角 3D 吉祥物的顯示、對話與果凍手感，拖滑桿時右下角會即時預覽</span>
          </span>
        </span>
        <span className="flex items-center gap-1.5 flex-wrap sm:justify-end">
          {status.map((s) => (
            <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-amber-200 text-amber-900">{s}</span>
          ))}
          <ChevronDown className={`w-4 h-4 text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Toggle label="全站顯示" hint="關閉後所有人都看不到" checked={draft.enabled} onChange={(v) => update({ enabled: v })} />
            <Toggle label="手機也顯示" hint="小螢幕會站在底部導覽列上方" checked={draft.showOnMobile} onChange={(v) => update({ showOnMobile: v })} />
            <Toggle label="開放提問" hint="AI 分流給三位 Dify 助理" checked={draft.chatEnabled} onChange={(v) => update({ chatEnabled: v })} />
            <Toggle label="音效" hint="開燈發亮、玻璃說話、觸電與撞擊聲" checked={draft.soundEnabled} onChange={(v) => update({ soundEnabled: v })} />
          </div>

          {/* 轉接檢查：三位助理的金鑰對應哪個 Dify 應用、測試分流 */}
          <AdminMascotRouteCheck />

          <div className="space-y-3 p-3 rounded-xl bg-white border border-stone-200">
            <p className="text-xs font-black text-stone-900">果凍手感</p>
            <Slider label="彈性" value={draft.firmness} {...MASCOT_LIMITS.firmness} digits={0} low="軟 Q" high="結實" onChange={(v) => update({ firmness: v })} />
            <Slider label="阻尼" value={draft.damping} {...MASCOT_LIMITS.damping} digits={1} low="晃很久" high="很快停" onChange={(v) => update({ damping: v })} />
            <Slider label="晃動幅度" value={draft.wobble} {...MASCOT_LIMITS.wobble} digits={2} low="含蓄" high="誇張" onChange={(v) => update({ wobble: v })} />
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => previewOnSite(draft, { __poke: true })} className="px-3 min-h-[40px] rounded-xl border border-stone-200 bg-stone-50 hover:border-amber-400 text-xs font-bold text-stone-800">
                戳一下試試
              </button>
              <button
                type="button"
                onClick={() => update({ firmness: DEFAULT_MASCOT_CONFIG.firmness, damping: DEFAULT_MASCOT_CONFIG.damping, wobble: DEFAULT_MASCOT_CONFIG.wobble })}
                className="px-3 min-h-[40px] rounded-xl border border-stone-200 bg-stone-50 hover:border-amber-400 text-xs font-bold text-stone-800"
              >
                手感恢復預設
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-white border border-stone-200">
            <label className="space-y-1 sm:col-span-2">
              <span className="block text-xs font-black text-stone-900">對話泡泡文字</span>
              <input value={draft.bubbleText} maxLength={60} onChange={(e) => setDraft((d) => ({ ...d, bubbleText: e.target.value }))} onBlur={() => update({})}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-base sm:text-sm text-stone-900 focus:outline-2 focus:outline-amber-400" />
            </label>
            <label className="space-y-1">
              <span className="block text-xs font-black text-stone-900">幾天沒來會想你</span>
              <span className="flex items-center gap-2">
                <input type="number" inputMode="numeric" {...MASCOT_LIMITS.sadAfterDays} value={draft.sadAfterDays} onChange={(e) => update({ sadAfterDays: Number(e.target.value) })}
                  className="w-24 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-base sm:text-sm text-stone-900 focus:outline-2 focus:outline-amber-400" />
                <span className="text-xs text-stone-500 font-medium">天</span>
              </span>
            </label>
            <label className="space-y-1">
              <span className="block text-xs font-black text-stone-900">想你時說的話</span>
              <input value={draft.sadText} maxLength={60} onChange={(e) => setDraft((d) => ({ ...d, sadText: e.target.value }))} onBlur={() => update({})}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-base sm:text-sm text-stone-900 focus:outline-2 focus:outline-amber-400" />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={save} disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-stone-950 text-sm font-black shadow-xs">
              <Save className="w-4 h-4" aria-hidden="true" />{saving ? '儲存中…' : '儲存設定'}
            </button>
            <button type="button" onClick={() => { setDraft(mascotConfig); previewOnSite(mascotConfig); setMsg(''); }} disabled={!dirty}
              className="inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl border border-stone-200 bg-white text-stone-700 disabled:opacity-40 text-sm font-bold">
              <RotateCcw className="w-4 h-4" aria-hidden="true" />還原
            </button>
            {dirty && !msg && <span className="text-xs text-amber-700 font-bold">有尚未儲存的變更</span>}
            {msg && <span className="text-xs text-emerald-700 font-bold" role="status">{msg}</span>}
          </div>
        </div>
      )}
    </section>
  );
};
