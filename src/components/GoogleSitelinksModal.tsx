import React, { useState } from 'react';
import {
  X,
  Search,
  ExternalLink,
  Copy,
  Check,
  Compass,
  PlusCircle,
  AlertCircle,
  GraduationCap,
  Flame,
  ShieldCheck,
  Layers,
  FileText,
  Trophy,
  ChevronRight,
  History,
  Smartphone,
  Monitor,
  Sparkles,
  Share2,
  Info,
} from 'lucide-react';
import { GOOGLE_SITELINKS, GoogleSitelinkItem, getSitelinkFullUrl } from '../services/seoService';

interface GoogleSitelinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSitelink: (item: GoogleSitelinkItem) => void;
}

export const GoogleSitelinksModal: React.FC<GoogleSitelinksModalProps> = ({
  isOpen,
  onClose,
  onNavigateToSitelink,
}) => {
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'desktop'>('mobile');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<'all' | 'ideax' | 'star_season'>('all');

  if (!isOpen) return null;

  const ideaxSitelinks = GOOGLE_SITELINKS.filter((s) => s.category === 'ideax');
  const starSeasonSitelinks = GOOGLE_SITELINKS.filter((s) => s.category === 'star_season');

  const handleCopyUrl = (e: React.MouseEvent, item: GoogleSitelinkItem) => {
    e.stopPropagation();
    const fullUrl = getSitelinkFullUrl(item);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl).then(() => {
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2500);
      });
    }
  };

  const getSitelinkIcon = (iconName: string) => {
    switch (iconName) {
      case 'Compass':
        return <Compass className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'PlusCircle':
        return <PlusCircle className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'AlertCircle':
        return <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />;
      case 'GraduationCap':
        return <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'Flame':
        return <Flame className="w-4 h-4 text-orange-500 shrink-0" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />;
      case 'Layers':
        return <Layers className="w-4 h-4 text-blue-500 shrink-0" />;
      case 'FileText':
        return <FileText className="w-4 h-4 text-indigo-500 shrink-0" />;
      case 'Trophy':
        return <Trophy className="w-4 h-4 text-amber-500 shrink-0" />;
      default:
        return <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50/80 via-white to-purple-50/60 border-b border-stone-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-stone-950 font-black flex items-center justify-center shadow-xs">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-stone-900 flex items-center gap-1.5">
                <span>Google 搜尋引擎分頁捷徑 (Sitelinks)</span>
                <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-bold">
                  SEO 結構化標準
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                點擊任一捷徑可直接跳轉，並自動於瀏覽器建立規範化獨立子網址 (Sub-URLs)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* 切換手機/電腦預覽模式 */}
            <div className="hidden sm:flex items-center p-0.5 bg-stone-100 rounded-xl border border-stone-200 text-xs font-bold text-stone-600">
              <button
                type="button"
                onClick={() => setDeviceMode('mobile')}
                className={`px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                  deviceMode === 'mobile' ? 'bg-white text-stone-900 shadow-2xs' : 'hover:text-stone-900'
                }`}
                title="Google 行動裝置搜尋結果預覽 (對齊截圖)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>手機版</span>
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('desktop')}
                className={`px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                  deviceMode === 'desktop' ? 'bg-white text-stone-900 shadow-2xs' : 'hover:text-stone-900'
                }`}
                title="Google 電腦版搜尋結果預覽"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>電腦版</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* 說明提示卡 */}
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/90 text-xs text-amber-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">搜尋引擎權威子網址與捷徑規範：</span>
              已在 HTML 檔頭配置 <strong>Schema.org SiteNavigationElement</strong> 與 <strong>WebSite Sitelinks Searchbox</strong>。當搜尋引擎爬梳時，即會如同獎金獵人展示此 8 個獨立分頁捷徑。
            </div>
          </div>

          {/* 搜尋引擎視覺展示卡 (模擬截圖中的 Google SERP 結果) */}
          <div className="rounded-3xl border border-stone-200 bg-[#FFFFFF] shadow-sm overflow-hidden">
            {/* 模擬 Google 搜尋頂部搜尋列 */}
            <div className="px-4 py-3 bg-[#F8F9FA] border-b border-stone-200/80 flex items-center gap-3">
              <div className="flex-1 bg-white rounded-full px-3.5 py-1.5 border border-stone-200 flex items-center gap-2 text-xs text-stone-700 shadow-2xs">
                <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="font-medium text-stone-900">IdeaX 創點子</span>
                <span className="ml-auto text-stone-400 text-[10px]">✕</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-stone-600">
                <span className="text-blue-600 border-b-2 border-blue-600 pb-0.5">全部</span>
                <span>圖片</span>
                <span>新聞</span>
              </div>
            </div>

            {/* Google SERP 結果本體 */}
            <div className="p-4 sm:p-5 space-y-3.5">
              {/* 網站小標頭 */}
              <div className="flex items-center gap-2.5">
                <img
                  src="/圓角正向黃底燈泡.png"
                  alt="IdeaX Favicon"
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-stone-200 shadow-2xs"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-stone-900 leading-tight">IdeaX 創點子</div>
                  <div className="text-[11px] text-stone-500 font-mono leading-tight">https://www.ideax.tw</div>
                </div>
              </div>

              {/* 主要大標題 */}
              <div className="text-base sm:text-lg font-bold text-[#1A0DAB] hover:underline cursor-pointer leading-snug">
                IdeaX 創點子 — 讓想法發光 • 高價值問題懸賞與解決方案交易市場
              </div>

              {/* 摘要文字 */}
              <p className="text-xs text-[#4D5156] leading-relaxed">
                高價值問題與解決方案交易市場，提供懸賞、深度解鎖、AI 智能媒合與專家變現。探索創新創業、技術研發與真實市場痛點，連結認證專家顧問共創價值。
              </p>

              {/* 分組標籤切換 */}
              <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setActiveGroup('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    activeGroup === 'all'
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  全部捷徑 (8)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGroup('ideax')}
                  className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    activeGroup === 'ideax'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  IdeaX 創點子 (4)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGroup('star_season')}
                  className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    activeGroup === 'star_season'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                  }`}
                >
                  創星季 (4)
                </button>
              </div>

              {/* Sitelinks 捷徑清單 (桌面版 2 欄真實 Google SERP 宮格，手機版直列捷徑) */}
              <div className={deviceMode === 'desktop' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2' : 'divide-y divide-stone-150 border-t border-b border-stone-200'}>
                {(activeGroup === 'all' || activeGroup === 'ideax' ? ideaxSitelinks : []).map(
                  (item, idx) => {
                    const isCopied = copiedId === item.id;
                    if (deviceMode === 'desktop') {
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            onNavigateToSitelink(item);
                            onClose();
                          }}
                          className="p-3 rounded-2xl bg-stone-50/70 hover:bg-blue-50/50 border border-stone-200/90 hover:border-blue-400 transition-all cursor-pointer group shadow-2xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-2">
                                {getSitelinkIcon(item.icon)}
                                <span className="font-bold text-sm text-[#1A0DAB] group-hover:underline">
                                  {item.name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleCopyUrl(e, item)}
                                className="p-1 rounded-md text-stone-400 hover:text-blue-600 hover:bg-blue-100 transition-colors"
                                title="複製完整網址"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <div className="text-[11px] text-[#4D5156] line-clamp-2 leading-relaxed">
                              {item.description}
                            </div>
                          </div>
                          <div className="mt-2.5 pt-2 border-t border-stone-200/70 flex items-center justify-between text-[11px]">
                            <span className="font-mono text-emerald-700 font-semibold truncate">
                              https://www.ideax.tw{item.path}
                            </span>
                            <span className="text-[10px] font-bold text-blue-600 group-hover:text-blue-800 flex items-center gap-0.5 shrink-0">
                              直達捷徑 <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          onNavigateToSitelink(item);
                          onClose();
                        }}
                        className="py-3 px-2 sm:px-3 hover:bg-stone-50 active:bg-amber-50/50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getSitelinkIcon(item.icon)}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#1A0DAB] group-hover:underline">
                                {item.name}
                              </span>
                              <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                                {item.categoryLabel}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-500 truncate mt-0.5">
                              {item.description}
                            </div>
                            <div className="text-[10px] font-mono text-stone-400 mt-0.5">
                              網址：<span className="text-stone-700">{item.path}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleCopyUrl(e, item)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-200/70 transition-colors"
                            title="複製此分頁獨立公開連結"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {idx % 2 === 0 ? (
                            <History className="w-4 h-4 text-stone-400 group-hover:text-stone-700" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700" />
                          )}
                        </div>
                      </div>
                    );
                  }
                )}

                {(activeGroup === 'all' || activeGroup === 'star_season' ? starSeasonSitelinks : []).map(
                  (item, idx) => {
                    const isCopied = copiedId === item.id;
                    if (deviceMode === 'desktop') {
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            onNavigateToSitelink(item);
                            onClose();
                          }}
                          className="p-3 rounded-2xl bg-purple-50/50 hover:bg-purple-100/60 border border-purple-200/90 hover:border-purple-400 transition-all cursor-pointer group shadow-2xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-2">
                                {getSitelinkIcon(item.icon)}
                                <span className="font-bold text-sm text-[#1A0DAB] group-hover:underline">
                                  {item.name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleCopyUrl(e, item)}
                                className="p-1 rounded-md text-stone-400 hover:text-purple-600 hover:bg-purple-100 transition-colors"
                                title="複製完整網址"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <div className="text-[11px] text-[#4D5156] line-clamp-2 leading-relaxed">
                              {item.description}
                            </div>
                          </div>
                          <div className="mt-2.5 pt-2 border-t border-purple-200/70 flex items-center justify-between text-[11px]">
                            <span className="font-mono text-purple-800 font-semibold truncate">
                              https://www.ideax.tw{item.path}
                            </span>
                            <span className="text-[10px] font-bold text-purple-700 group-hover:text-purple-900 flex items-center gap-0.5 shrink-0">
                              直達捷徑 <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          onNavigateToSitelink(item);
                          onClose();
                        }}
                        className="py-3 px-2 sm:px-3 hover:bg-stone-50 active:bg-purple-50/50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getSitelinkIcon(item.icon)}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#1A0DAB] group-hover:underline">
                                {item.name}
                              </span>
                              <span className="text-[10px] font-bold text-purple-900 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-300">
                                {item.categoryLabel}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-500 truncate mt-0.5">
                              {item.description}
                            </div>
                            <div className="text-[10px] font-mono text-stone-400 mt-0.5">
                              網址：<span className="text-stone-700">{item.path}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleCopyUrl(e, item)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-200/70 transition-colors"
                            title="複製此分頁獨立公開連結"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {idx % 2 === 0 ? (
                            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700" />
                          ) : (
                            <History className="w-4 h-4 text-stone-400 group-hover:text-stone-700" />
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="text-stone-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>支援雙向 URL 同步：進入分頁自動於網址列顯示獨立子網址</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer self-end sm:self-auto"
          >
            關閉預覽
          </button>
        </div>
      </div>
    </div>
  );
};
