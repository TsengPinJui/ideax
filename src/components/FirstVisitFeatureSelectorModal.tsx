import React, { useState } from 'react';
import { Sparkles, Lightbulb, Flame, MessageCircle, Landmark, ArrowRight, X, Compass, Check } from 'lucide-react';

export type OnboardingTrackType = 'create_ideas' | 'pain_points' | 'l0_discussion' | 'kingdom_3d';

export const FIRST_VISIT_STORAGE_KEY = 'ideax_first_time_feature_selected_v1';

interface FirstVisitFeatureSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFeature: (track: OnboardingTrackType) => void;
}

interface FeatureOption {
  id: OnboardingTrackType;
  title: string;
  badge: string;
  tagColor: string;
  borderColor: string;
  activeBorderColor: string;
  bgColor: string;
  iconBg: string;
  iconColor: string;
  icon: React.FC<{ className?: string }>;
  summary: string;
  highlights: string[];
}

const FEATURE_OPTIONS: FeatureOption[] = [
  {
    id: 'create_ideas',
    title: '創新提案',
    badge: '五階段分級',
    tagColor: 'bg-amber-100 text-amber-900 border-amber-300',
    borderColor: 'border-amber-200 hover:border-amber-400',
    activeBorderColor: 'border-amber-500 ring-2 ring-amber-400/50 bg-amber-50/70',
    bgColor: 'hover:bg-amber-50/50',
    iconBg: 'bg-amber-500 text-stone-950',
    iconColor: 'text-amber-600',
    icon: Lightbulb,
    summary: '依完程度分為「初步構想、正在計畫、實行中、已完成、成功驗證」五級！系統自動記錄發布時間保護原創，還能獲得打賞提現與投資洽談機會。',
    highlights: ['五階段完程度分級', '自動記錄發布時間', '打賞可提現'],
  },
  {
    id: 'pain_points',
    title: '提出痛點',
    badge: 'L0~L4 分級',
    tagColor: 'bg-rose-100 text-rose-900 border-rose-300',
    borderColor: 'border-rose-200 hover:border-rose-400',
    activeBorderColor: 'border-rose-500 ring-2 ring-rose-400/50 bg-rose-50/70',
    bgColor: 'hover:bg-rose-50/50',
    iconBg: 'bg-rose-500 text-white',
    iconColor: 'text-rose-600',
    icon: Flame,
    summary: '分為 L0（無懸賞）公開許願與 L1～L4 分級懸賞！把生活或工作難題寫出來，不僅能獲得打賞提現，還能吸引各領域專家為您提供解答與提案。',
    highlights: ['L0無懸賞 / L1~L4分級', '打賞可提現', '獲得專業解答'],
  },
  {
    id: 'l0_discussion',
    title: '交流討論',
    badge: 'L0 無懸賞',
    tagColor: 'bg-sky-100 text-sky-900 border-sky-300',
    borderColor: 'border-sky-200 hover:border-sky-400',
    activeBorderColor: 'border-sky-500 ring-2 ring-sky-400/50 bg-sky-50/70',
    bgColor: 'hover:bg-sky-50/50',
    iconBg: 'bg-sky-500 text-white',
    iconColor: 'text-sky-600',
    icon: MessageCircle,
    summary: '討論都是 L0（無懸賞），輕鬆無壓力交流！不管是創業想法、專業問題或日常話題，都能隨時發起討論並認識志同道合的新夥伴。',
    highlights: ['都是 L0（無懸賞）', '輕鬆無壓力交流', '認識新夥伴'],
  },
  {
    id: 'kingdom_3d',
    title: '3D島覽與實境漫遊',
    badge: '3D水鄉世界',
    tagColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
    activeBorderColor: 'border-emerald-500 ring-2 ring-emerald-400/50 bg-emerald-50/70',
    bgColor: 'hover:bg-emerald-50/50',
    iconBg: 'bg-emerald-600 text-white',
    iconColor: 'text-emerald-600',
    icon: Landmark,
    summary: '走進 3D 江南水鄉！可俯瞰五大主題島嶼尋找彩蛋，或切換第一人稱漫步街道、划船遊湖、騎仙鶴，還能邀請好友同遊、解雙人羈絆任務。',
    highlights: ['3D地圖尋寶', '第一人稱漫遊', '好友同遊解雙人任務'],
  },
];

export const FirstVisitFeatureSelectorModal: React.FC<FirstVisitFeatureSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectFeature,
}) => {
  const [selectedId, setSelectedId] = useState<OnboardingTrackType>('create_ideas');

  if (!isOpen) return null;

  const handleConfirm = () => {
    try {
      localStorage.setItem(FIRST_VISIT_STORAGE_KEY, 'true');
    } catch {}
    onSelectFeature(selectedId);
  };

  const handleSkip = () => {
    try {
      localStorage.setItem(FIRST_VISIT_STORAGE_KEY, 'true');
    } catch {}
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-visit-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-stone-950/65 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* 頂部裝飾光帶 */}
        <div className="h-2 bg-gradient-to-r from-amber-400 via-rose-400 via-sky-400 to-emerald-500" />

        {/* 關閉按鈕 */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
          title="略過並自行探索"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 sm:p-7 space-y-5">
          {/* 標題與簡介 */}
          <div className="space-y-1.5 pr-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>新手引導教學</span>
            </div>
            <h2 id="first-visit-modal-title" className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              歡迎來到 IdeaX！請選擇您首先想探索的功能
            </h2>
          </div>

          {/* 四大選項卡片格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="核心功能選擇">
            {FEATURE_OPTIONS.map((item) => {
              const isSelected = selectedId === item.id;
              const IconComp = item.icon;
              return (
                <div
                  key={item.id}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(item.id);
                    }
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-2.5 select-none ${
                    isSelected ? item.activeBorderColor : `${item.borderColor} ${item.bgColor} bg-stone-50/50`
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl ${item.iconBg} flex items-center justify-center shadow-xs shrink-0`}>
                          <IconComp className="w-4.5 h-4.5" />
                        </div>
                        <span className="text-base font-black text-stone-900">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.tagColor}`}>
                          {item.badge}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 font-medium leading-relaxed">
                      {item.summary}
                    </p>
                  </div>

                  {/* 特色亮點小標籤 */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-stone-200/60">
                    {item.highlights.map((h, i) => (
                      <span key={i} className="text-[10px] font-bold text-stone-500 bg-white/80 border border-stone-200 px-1.5 py-0.5 rounded-md">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 底部確認與略過按鈕 */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs sm:text-sm font-bold text-stone-500 hover:text-stone-800 px-3 py-2 rounded-xl transition-colors cursor-pointer text-center"
            >
              隨意逛逛 (略過引導)
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-stone-950 font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-stone-950" />
              <span>開始探索此功能</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
