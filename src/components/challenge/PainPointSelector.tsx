import React, { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  CheckCircle2,
  X,
  Sparkles,
  HelpCircle,
  ChevronDown,
  FileText,
  User,
  Tag,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { StarSeasonProposal, STAR_SEASON_TRACKS, StarSeasonTrack } from '../../types/competition';
import { Question } from '../../types';
import { useApp } from '../../context/AppContext';
import { isPainPointQuestion } from '../../utils/questionUtils';

export interface SelectablePainPoint {
  id: string;
  serial: string; // e.g. "#01", "#02", "PP-04", "Q-01"
  displaySerial: string;
  title: string;
  trackTag: string;
  trackId?: StarSeasonTrack;
  authorName: string;
  summary: string;
  description?: string;
  sourceType: 'competition' | 'platform';
  originalProposal?: StarSeasonProposal;
  originalQuestion?: Question;
}

interface PainPointSelectorProps {
  value: string; // selected pain point ID
  onChange: (id: string, painPoint?: SelectablePainPoint) => void;
  painPointProposals: StarSeasonProposal[];
  onApplySuggestedTitle?: (suggestedTitle: string, suggestedSummary: string) => void;
  className?: string;
}

export const PainPointSelector: React.FC<PainPointSelectorProps> = ({
  value,
  onChange,
  painPointProposals,
  onApplySuggestedTitle,
  className = '',
}) => {
  const { questions } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isOpenDropdown, setIsOpenDropdown] = useState<boolean>(false);
  const [previewPainPoint, setPreviewPainPoint] = useState<SelectablePainPoint | null>(null);

  // 統合創星季痛點與平台真實痛點/問題清單，給予標準序號
  const allPainPoints = useMemo<SelectablePainPoint[]>(() => {
    const list: SelectablePainPoint[] = [];

    // 1. 創星季第一階段提案中之痛點
    painPointProposals.forEach((pp, idx) => {
      const serialNum = (idx + 1).toString().padStart(2, '0');
      list.push({
        id: pp.id,
        serial: `#P-${serialNum}`,
        displaySerial: `#${idx + 1}`,
        title: pp.title,
        trackTag: STAR_SEASON_TRACKS[pp.track]?.tag || '創星痛點',
        trackId: pp.track,
        authorName: pp.authorName || '創星徵件用戶',
        summary: pp.summary || '',
        description: pp.description || '',
        sourceType: 'competition',
        originalProposal: pp,
      });
    });

    // 2. IdeaX 主平台切身痛點與懸賞問題
    const platformQuestions = questions.filter(
      (q) => q.status !== 'delisted' && q.id
    );

    platformQuestions.forEach((q, idx) => {
      // 避免重複 ID
      if (list.some((item) => item.id === q.id)) return;
      const serialNum = (idx + 1).toString().padStart(2, '0');
      const numOnly = q.id.replace(/\D/g, '') || (idx + 1).toString();
      list.push({
        id: q.id,
        serial: `#Q-${serialNum}`,
        displaySerial: `#${numOnly}`,
        title: q.title,
        trackTag: isPainPointQuestion(q) ? '切身痛點' : (q.category || '創新痛點'),
        authorName: q.authorName || '平台會員',
        summary: q.description ? q.description.slice(0, 150) + '...' : '',
        description: q.description || '',
        sourceType: 'platform',
        originalQuestion: q,
      });
    });

    return list;
  }, [painPointProposals, questions]);

  // 目前選中的痛點物件
  const selectedPainPoint = useMemo(() => {
    if (!value) return null;
    return allPainPoints.find((p) => p.id === value) || null;
  }, [value, allPainPoints]);

  // 依輸入字串（序號或名稱）過濾痛點
  const filteredPainPoints = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allPainPoints;

    // 清理查詢字串以利比對數字序號
    const queryDigits = query.replace(/[#q-]/g, '');

    return allPainPoints.filter((p) => {
      const titleMatch = p.title.toLowerCase().includes(query);
      const idMatch = p.id.toLowerCase().includes(query);
      const serialMatch = p.serial.toLowerCase().includes(query) || p.displaySerial.toLowerCase().includes(query);
      const authorMatch = p.authorName.toLowerCase().includes(query);
      const tagMatch = p.trackTag.toLowerCase().includes(query);
      const summaryMatch = p.summary.toLowerCase().includes(query);

      // 支援純數字比對序號（如使用者只輸入 '1' 或 '01' 或 '2'）
      const serialDigitsMatch = queryDigits && (
        p.serial.replace(/[#q-]/g, '').includes(queryDigits) ||
        p.displaySerial.replace(/[#q-]/g, '').includes(queryDigits) ||
        p.id.replace(/\D/g, '').includes(queryDigits)
      );

      return titleMatch || idMatch || serialMatch || authorMatch || tagMatch || summaryMatch || serialDigitsMatch;
    });
  }, [searchQuery, allPainPoints]);

  const handleSelect = (pp: SelectablePainPoint | null) => {
    if (!pp) {
      onChange('');
      setIsOpenDropdown(false);
      setSearchQuery('');
      return;
    }
    onChange(pp.id, pp);
    setIsOpenDropdown(false);
    setSearchQuery('');
  };

  const handleApplySuggested = () => {
    if (!selectedPainPoint || !onApplySuggestedTitle) return;
    const cleanTitle = selectedPainPoint.title.replace(/^【.*?】\s*/, '');
    const suggestedTitle = `針對「${cleanTitle}」之創新解方`;
    const suggestedSummary = `本提案針對痛點【${selectedPainPoint.title}】提出具體可落地之創新解決方案，專注改善關鍵需求與實務瓶頸。`;
    onApplySuggestedTitle(suggestedTitle, suggestedSummary);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* 標題與說明 */}
      <div className="flex items-center justify-between">
        <label className="block text-amber-950 font-bold text-sm flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>採用來源痛點（可輸入痛點序號或名稱查詢，若無可自訂）</span>
        </label>
        <span className="text-[11px] font-medium text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
          共 {allPainPoints.length} 個切身與公開痛點
        </span>
      </div>

      {/* 搜尋與查詢輸入列 */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpenDropdown(true);
              }}
              onFocus={() => setIsOpenDropdown(true)}
              placeholder="輸入痛點序號 (例如: #01, q-1, 1) 或用痛點名稱/關鍵字查詢..."
              className="w-full bg-white border border-amber-300 focus:border-amber-500 rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsOpenDropdown((prev) => !prev)}
            className="px-3 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          >
            <span>痛點清單</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpenDropdown ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* 即時搜尋候選下拉清單 */}
        {isOpenDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-amber-300 rounded-2xl shadow-xl z-30 max-h-72 overflow-y-auto divide-y divide-stone-100 text-stone-900 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* 清除/不引用選項 */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-stone-50 flex items-center justify-between text-xs font-bold text-stone-600 transition-colors"
            >
              <span>-- 發想全新解方或自定痛點（不引用特定痛點） --</span>
              {!value && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </button>

            {filteredPainPoints.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-500">
                查無符合「{searchQuery}」的痛點，您可嘗試輸入其他關鍵字或序號。
              </div>
            ) : (
              filteredPainPoints.map((pp) => {
                const isSelected = value === pp.id;
                return (
                  <div
                    key={pp.id}
                    className={`w-full px-3.5 py-2.5 hover:bg-amber-50/70 cursor-pointer flex items-start justify-between gap-3 transition-colors ${
                      isSelected ? 'bg-amber-50 font-bold' : ''
                    }`}
                    onClick={() => handleSelect(pp)}
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400/90 text-stone-950">
                          {pp.serial}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                          {pp.trackTag}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          提問/提出者: {pp.authorName}
                        </span>
                      </div>
                      <div className="text-xs text-stone-900 font-bold leading-snug line-clamp-2">
                        {pp.title}
                      </div>
                      {pp.summary && (
                        <div className="text-[11px] text-stone-500 line-clamp-1">
                          {pp.summary}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewPainPoint(pp);
                        }}
                        title="查看此痛點完整內容"
                        className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-amber-200 text-stone-700 hover:text-amber-900 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors"
                      >
                        <span>詳情</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 已選中的痛點卡片與【前往痛點的捷徑】 */}
      {selectedPainPoint ? (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50/60 border border-amber-300 shadow-2xs space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-stone-950 text-amber-300 shadow-2xs">
                  {selectedPainPoint.serial}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 border border-amber-300">
                  {selectedPainPoint.trackTag}
                </span>
                <span className="text-xs text-stone-600 font-medium">
                  提出者：{selectedPainPoint.authorName}
                </span>
              </div>
              <h4 className="font-black text-stone-950 text-sm leading-snug pt-0.5">
                {selectedPainPoint.title}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="text-stone-400 hover:text-rose-600 p-1 rounded-lg hover:bg-white/80 transition-colors cursor-pointer shrink-0"
              title="清除已選引用痛點"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedPainPoint.summary && (
            <p className="text-stone-700 text-xs leading-relaxed bg-white/70 p-2.5 rounded-xl border border-amber-200/60 line-clamp-2">
              {selectedPainPoint.summary}
            </p>
          )}

          {/* 行動按鈕列：【前往痛點捷徑】 + 【自動帶入標題】 */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewPainPoint(selectedPainPoint)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs cursor-pointer shadow-2xs transition-all active:scale-98"
              >
                <span>前往痛點查看詳情</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              {onApplySuggestedTitle && (
                <button
                  type="button"
                  onClick={handleApplySuggested}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-100/70 border border-amber-300 text-stone-800 text-xs font-bold cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>套用建議標題</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpenDropdown(true)}
              className="text-amber-800 hover:text-amber-950 text-xs font-bold underline cursor-pointer"
            >
              更換其他痛點
            </button>
          </div>

          <div className="pt-1 border-t border-amber-200/50 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
            <span>💡 <b>痛點採用獎機制：</b>若本案獲決選前三名，原痛點提出者將共享 NT$1,000 好禮（800 點提問金）！</span>
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-500 flex items-center justify-between">
          <span>目前尚未引用特定痛點（將作為自主原創提案發布）</span>
          <button
            type="button"
            onClick={() => setIsOpenDropdown(true)}
            className="text-amber-700 hover:text-amber-900 font-bold cursor-pointer"
          >
            從痛點清單中選取 ↗
          </button>
        </div>
      )}

      {/* 痛點完整詳情預覽彈窗 (Pain Point Detail Modal) */}
      {previewPainPoint && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-amber-300 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 my-8 shadow-2xl text-stone-900 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            {/* 彈窗頂部 */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-stone-950 text-amber-300">
                  {previewPainPoint.serial}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  {previewPainPoint.trackTag}
                </span>
                <span className="text-xs font-bold text-stone-500">
                  來源：{previewPainPoint.sourceType === 'competition' ? '創星季第一階段痛點徵件' : 'IdeaX 切身痛點專區'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPainPoint(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 痛點標題與作者 */}
            <div>
              <h3 className="text-base sm:text-lg font-black text-stone-950 leading-snug">
                {previewPainPoint.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-stone-500 mt-2">
                <span className="flex items-center gap-1 font-bold text-stone-700">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  提出者：{previewPainPoint.authorName}
                </span>
                <span>痛點 ID：{previewPainPoint.id}</span>
              </div>
            </div>

            {/* 痛點詳細描述與背景 */}
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                <div className="font-black text-amber-950 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-700" />
                  <span>痛點問題背景與關鍵瓶頸說明</span>
                </div>
                <p className="text-stone-800 leading-relaxed whitespace-pre-line">
                  {previewPainPoint.description || previewPainPoint.summary || '暫無詳細說明。'}
                </p>
              </div>

              {/* 痛點採用獎機制 */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>痛點採用獎勵連動機制</span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  若本提案引用此痛點並在第三階段專家決選中榮獲前三名，本痛點提出者將可額外獲得價值 NT$1,000 好禮（800 點 IdeaX 平台提問金）；排名前 4~10 名則享價值 NT$500 好禮（400 點提問金）！
                </p>
              </div>
            </div>

            {/* 彈窗底部操作 */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPreviewPainPoint(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer transition-colors"
              >
                關閉視窗
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSelect(previewPainPoint);
                  setPreviewPainPoint(null);
                }}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs cursor-pointer shadow-md transition-all active:scale-98 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-stone-950" />
                <span>確認引用此痛點進行提案</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
